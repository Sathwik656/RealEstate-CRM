import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Search, Bell, User, Menu } from 'lucide-react';

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

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
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
    <header className="h-16 bg-surface border-b border-border/70 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-10 relative">
      {/* Left: Mobile Menu Toggle & Page Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle Menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div>
          <h2 className="text-base font-display font-semibold text-primary">{title}</h2>
          <p className="text-xs text-muted hidden md:block mt-0.5">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Center: Search Trigger (Cmd+K inspired) */}
      <div className="hidden sm:flex items-center absolute left-1/2 -translate-x-1/2">
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
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Search Icon */}
        <button
          onClick={() => navigate('/search')}
          className="sm:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        {/* Notification Dropdown */}
        <NotificationDropdown />

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-border/70">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs border border-white/20"
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
