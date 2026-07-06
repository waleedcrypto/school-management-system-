import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Users, User, BookOpen, Clock, CreditCard, Settings, LogOut, Bell, Menu, X, Building, TrendingUp, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../Logo';

export default function SchoolAdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [schoolName, setSchoolName] = useState('Loading...');
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('Admin');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, school_id')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        setProfileName(`${profile.first_name} ${profile.last_name}`);
        
        if (profile.school_id) {
          const { data: school } = await supabase
            .from('schools')
            .select('name, logo_url')
            .eq('id', profile.school_id)
            .single();
            
          if (school) {
            setSchoolName(school.name);
            setSchoolLogo(school.logo_url);
          }
        }
      }
    }
    
    fetchData();

    window.addEventListener('profileUpdated', fetchData);
    return () => window.removeEventListener('profileUpdated', fetchData);
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/school-admin/dashboard', icon: LayoutDashboard },
    { name: 'Subjects', path: '/school-admin/subjects', icon: BookOpen },
    { name: 'Assignments', path: '/school-admin/assignments', icon: BookOpen },
    { name: 'Marks', path: '/school-admin/marks', icon: BookOpen },
    { name: 'Teacher Mgmt', path: '/school-admin/teachers', icon: BookOpen },
    { name: 'Student Mgmt', path: '/school-admin/students', icon: Users },
    { name: 'Promotions', path: '/school-admin/promotions', icon: TrendingUp },
    { name: 'Documents', path: '/school-admin/documents', icon: FileText },
    { name: 'Classes', path: '/school-admin/classes', icon: Users },
    { name: 'Attendance', path: '/school-admin/attendance', icon: Clock },
    { name: 'Fee Mgmt', path: '/school-admin/fees', icon: CreditCard },
    { name: 'Settings', path: '/school-admin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 w-64 shrink-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col z-50 transform transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between border-b border-outline-variant">
          <Logo className="scale-75 origin-left" />
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-label-md transition-colors",
                  isActive 
                    ? "bg-secondary/10 text-secondary border-l-4 border-secondary" 
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <Link to="/school-admin/settings" onClick={() => setIsMobileMenuOpen(false)} className="block p-4 border-t border-outline-variant hover:bg-surface-container transition-colors cursor-pointer">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-outline-variant flex flex-col items-center justify-center text-on-surface-variant overflow-hidden shrink-0">
              {schoolLogo ? (
                <img src={schoolLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-label-md truncate text-on-surface capitalize">{schoolName}</p>
              <p className="text-xs text-on-surface-variant truncate capitalize">{profileName}</p>
            </div>
          </div>
        </Link>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-surface-container-lowest border-b border-outline-variant px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <button 
              className="p-2 -ml-2 rounded-md lg:hidden text-on-surface-variant hover:bg-surface-container hover:text-on-surface shrink-0"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {schoolLogo && (
              <div className="w-8 h-8 rounded-full border border-outline-variant overflow-hidden hidden sm:block shrink-0">
                 <img src={schoolLogo} alt="School Logo" className="w-full h-full object-cover" />
              </div>
            )}
            
            <div className="flex flex-col overflow-hidden">
              <span className="font-medium text-on-surface truncate capitalize">{schoolName}</span>
              <span className="text-sm text-on-surface-variant truncate capitalize">Principal - {profileName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3 shrink-0 ml-4">
            <button className="flex text-on-surface-variant hover:text-on-surface p-2 rounded-md hover:bg-surface-container transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface-container-lowest"></span>
            </button>
            <Link to="/school-admin/settings" className="flex text-on-surface-variant hover:text-on-surface p-2 rounded-md hover:bg-surface-container transition-colors">
              <Settings className="w-5 h-5" />
            </Link>
            <div className="w-px h-6 bg-outline-variant mx-1 hidden sm:block"></div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-label-md px-3 py-2 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
