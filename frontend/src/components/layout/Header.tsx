import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Search, Bell, User } from 'lucide-react';

import { NotificationDropdown } from './NotificationDropdown';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/properties': 'Properties',
  '/sellers': 'Sellers',
  '/buyers': 'Buyers',
  '/search': 'Global Search',
  '/settings': 'Settings',
  '/allotments': 'Allotment Requests',
  '/deal-approvals': 'Deal Approvals',
  '/deals': 'Deals',
  '/reports': 'Reports',
  '/agents': 'Agents',
};

export function Header() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const title = PAGE_TITLES[pathname] ?? 'Dashboard';

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="h-16 bg-surface border-b border-border/70 flex items-center justify-between px-6 flex-shrink-0 z-10">
      {/* Left: Page Title & Date */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-base font-display font-semibold text-primary">{title}</h2>
          <p className="text-xs text-muted hidden md:block mt-0.5">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Center: Search Trigger (Cmd+K inspired) */}
      <div className="hidden sm:flex items-center">
        <button
          onClick={() => navigate('/search')}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-surface-alt hover:bg-slate-200/60 border border-border/80 text-muted hover:text-primary text-xs font-medium transition-all group w-64 justify-between shadow-xs"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-muted group-hover:text-accent transition-colors" />
            <span>Search properties, leads...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-surface rounded border border-border text-muted group-hover:border-accent/40 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Notifications & User Avatar */}
      <div className="flex items-center gap-3">
        {/* Notification Dropdown */}
        <NotificationDropdown />

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-border/70">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs border border-white/20"
            style={{ background: 'linear-gradient(135deg, #171C2B, #2A334B)' }}
          >
            {user?.name?.[0]?.toUpperCase() ?? <User size={15} />}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-primary leading-tight">{user?.name || 'Verandah Reality'}</p>
            <p className="text-[11px] text-muted capitalize leading-none mt-0.5">{user?.role || 'Admin'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
