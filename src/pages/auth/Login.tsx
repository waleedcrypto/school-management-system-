import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../../components/Logo';

export default function Login() {
  const navigate = useNavigate();
  const { loginAsSuperAdmin } = useAuth();
  
  const getGreeting = () => {
    // Get current hour in Pakistan Time (Asia/Karachi)
    const options = { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-US', options as any);
    const hour = parseInt(formatter.format(new Date()), 10);
    
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      // Check Super Admin first
      const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
      const superAdminPassword = import.meta.env.VITE_SUPER_ADMIN_PASSWORD;

      if (email === superAdminEmail && password === superAdminPassword) {
        loginAsSuperAdmin();
        navigate('/super-admin/dashboard');
        return;
      }

      // Regular Supabase Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Wait for auth context to update and route accordingly
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();
        
      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }
        
      if (profile?.role === 'school_admin') {
        navigate('/school-admin/dashboard');
      } else if (!profile) {
        setErrorMsg('Your account profile is incomplete. Please try registering again with a different email.');
        await supabase.auth.signOut();
      } else {
        setErrorMsg('Teacher portal is not yet available in Phase 1.');
        await supabase.auth.signOut();
      }

    } catch (error: any) {
      if (error.message === 'Invalid login credentials') {
        setErrorMsg('Invalid login credentials. If you recently registered, please check your inbox and verify your email address before logging in.');
      } else {
        setErrorMsg(error.message || 'Invalid login credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8F9FA] font-sans">
      {/* Left Side: Campus/Library Image */}
      <div className="hidden md:block md:w-1/2 relative">
        <div className="absolute inset-0 bg-black/10 z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=2000&q=80" 
          alt="Institute Classroom" 
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[440px] bg-white rounded-2xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-col items-center mb-8">
            <Logo className="mb-6 scale-90" />
            <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-2">{getGreeting()}</h2>
            <p className="text-gray-500 text-sm">Sign in to CampusDesk</p>
          </div>
          
          {errorMsg && (
            <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="email">Email Address</label>
              <input 
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] py-2.5 px-3.5 transition-all text-sm outline-none" 
                id="email" 
                type="email" 
                placeholder="admin@institute.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="password">Password</label>
              <input 
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] py-2.5 px-3.5 transition-all text-sm outline-none tracking-widest" 
                id="password" 
                type="password"
                placeholder="••••••••" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex justify-end mt-2">
                <Link to="/forgot-password" className="text-sm text-[#2563EB] hover:underline font-medium">Forgot Password?</Link>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-full font-medium text-white bg-[#2563EB] hover:bg-blue-700 transition-colors disabled:opacity-50 mt-4 shadow-sm"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Is your institute new to CampusDesk?<br/>
              <Link to="/register" className="text-[#2563EB] hover:underline font-medium mt-1 inline-block">
                Register your institution
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
