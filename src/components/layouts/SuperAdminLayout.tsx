import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, School, Users, FileText, Settings, LogOut, Bell, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Logo } from '../Logo';
import { useState } from 'react';

export default function SuperAdminLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/super-admin/dashboard', icon: LayoutDashboard },
    { name: 'Institute Management', path: '/super-admin/schools', icon: School },
    { name: 'System Reports', path: '/super-admin/reports', icon: FileText },
    { name: 'Settings', path: '/super-admin/settings', icon: Settings },
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

        <div className="p-4 border-t border-outline-variant">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">
              SA
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-label-md truncate">Super Admin</p>
              <p className="text-xs text-on-surface-variant truncate">admin@campusdesk.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-surface-container-lowest border-b border-outline-variant px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="p-2 -ml-2 rounded-md lg:hidden text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Search or breadcrumbs could go here */}
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <button className="hidden sm:flex text-on-surface-variant hover:text-on-surface p-2 rounded-md hover:bg-surface-container transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-error hover:text-error/80 hover:bg-error/10 font-label-md px-3 py-2 rounded-md transition-colors"
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
