import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'super_admin' | 'school_admin' | 'teacher' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  schoolId: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  loginAsSuperAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for super admin session in local storage (mock for env-based auth)
    const isSuperAdmin = localStorage.getItem('is_super_admin') === 'true';
    
    if (isSuperAdmin) {
      setRole('super_admin');
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setRole(null);
        setSchoolId(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, school_id')
        .eq('id', userId)
        .single();
        
      if (data) {
        setRole(data.role as AppRole);
        setSchoolId(data.school_id);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('is_super_admin');
    await supabase.auth.signOut();
    setRole(null);
    setSchoolId(null);
    setUser(null);
    setSession(null);
  };

  const loginAsSuperAdmin = () => {
    localStorage.setItem('is_super_admin', 'true');
    setRole('super_admin');
    setSchoolId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, schoolId, isLoading, signOut, loginAsSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
