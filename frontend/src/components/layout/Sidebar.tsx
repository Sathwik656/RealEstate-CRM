import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserSquare2,
  UserCog,
  Search,
  Settings,
  Handshake,
  ClipboardCheck,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '@/context/AuthContext';

const navItems = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Properties', to: '/properties', icon: Building2 },
  { name: 'Sellers', to: '/sellers', icon: Users },
  { name: 'Buyers', to: '/buyers', icon: UserSquare2 },
  { name: 'My Deals', to: '/deals', icon: Handshake, requireAgent: true },
  { name: 'Allotment Requests', to: '/allotments', icon: Users, requireAdmin: true },
  { name: 'Deal Approvals', to: '/deal-approvals', icon: ClipboardCheck, requireAdmin: true },
  { name: 'Reports', to: '/reports', icon: FileText },
  { name: 'Agents', to: '/agents', icon: UserCog, requireAdmin: true },
  { name: 'Global Search', to: '/search', icon: Search },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export function Sidebar() {
  const { user } = useAuth();

  const visibleNavItems = navItems.filter(item => {
    if (item.requireAdmin && user?.role !== 'admin') return false;
    if (item.requireAgent && user?.role !== 'agent') return false;
    return true;
  });
  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-full"
      style={{
        background: 'linear-gradient(180deg, #1a1f2e 0%, #0d1117 100%)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
      }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Veenu CRM Logo" className="h-10 w-auto object-contain" />
          <span className="text-lg font-display font-bold text-white leading-none tracking-wide">
            THE VERANDAH
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-accent text-primary shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={18}
                  className={clsx(
                    'flex-shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'text-white/40 group-hover:text-white/80'
                  )}
                />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="text-[10px] text-white/25 text-center uppercase tracking-widest">
          Premium Real Estate Suite
        </div>
      </div>
    </aside>
  );
}
