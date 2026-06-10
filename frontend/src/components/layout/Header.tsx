import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, Bell } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/properties': 'Properties',
  '/sellers': 'Sellers',
  '/buyers': 'Buyers',
  '/rentals': 'Rental Properties',
  '/tenants': 'Tenants',
  '/leases': 'Lease Agreements',
  '/search': 'Global Search',
};

export function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const title = PAGE_TITLES[pathname] ?? 'Veenu CRM';

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 flex-shrink-0 z-10">
      <div>
        <h2 className="text-lg font-display font-semibold text-primary">{title}</h2>
        <p className="text-xs text-muted hidden md:block">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell (cosmetic) */}
        <button className="btn-icon hover:text-accent relative">
          <Bell size={18} />
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1a1f2e, #252b3b)' }}
          >
            {user?.name?.[0]?.toUpperCase() ?? <User size={16} />}
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-primary leading-none">{user?.name || 'Admin'}</p>
            <p className="text-xs text-muted mt-0.5 capitalize">{user?.role || 'Administrator'}</p>
          </div>
        </div>

        {/* Logout (Hidden on mobile as it's in the bottom menu) */}
        <button
          onClick={logout}
          className="btn-icon hover:text-red-500 hover:bg-red-50 hidden lg:block"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
