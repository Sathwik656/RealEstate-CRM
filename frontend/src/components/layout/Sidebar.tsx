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

const navGroups = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { name: 'Global Search', to: '/search', icon: Search },
    ],
  },
  {
    title: 'CRM',
    items: [
      { name: 'Properties', to: '/properties', icon: Building2 },
      { name: 'Sellers', to: '/sellers', icon: Users },
      { name: 'Buyers', to: '/buyers', icon: UserSquare2 },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'My Deals', to: '/deals', icon: Handshake, requireAgent: true },
      { name: 'Allotment Requests', to: '/allotments', icon: Users, requireAdmin: true },
      { name: 'Deal Approvals', to: '/deal-approvals', icon: ClipboardCheck, requireAdmin: true },
    ],
  },
  {
    title: 'Management',
    items: [
      { name: 'Reports', to: '/reports', icon: FileText },
      { name: 'Agents', to: '/agents', icon: UserCog, requireAdmin: true },
    ],
  }
];

export function Sidebar() {
  const { user } = useAuth();

  const visibleGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.requireAdmin && user?.role !== 'admin') return false;
      if (item.requireAgent && user?.role !== 'agent') return false;
      return true;
    })
  })).filter(group => group.items.length > 0);
  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-full border-r border-white/5"
      style={{
        background: 'linear-gradient(180deg, #171C2B 0%, #202638 100%)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
      }}
    >
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-white/5 relative">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Veenu CRM Logo" className="h-9 w-auto object-contain drop-shadow-md" />
          <span className="text-[17px] font-display font-bold text-white tracking-widest leading-none mt-1">
            THE VERANDAH
          </span>
        </div>
        <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-accent/0 via-accent/30 to-accent/0" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <div className="px-3.5 mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-accent/90">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all duration-200 group relative overflow-hidden',
                      isActive
                        ? 'text-white font-semibold shadow-md'
                        : 'text-white/60 font-medium hover:text-white hover:bg-white/5 hover:translate-x-1'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-accent to-[#B5923E] opacity-90" />
                      )}
                      <item.icon
                        size={18}
                        className={clsx(
                          'flex-shrink-0 transition-colors relative z-10',
                          isActive ? 'text-white drop-shadow-sm' : 'text-white/40 group-hover:text-white/80'
                        )}
                      />
                      <span className="relative z-10">{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="px-4 pb-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all duration-200 group relative overflow-hidden',
              isActive
                ? 'text-white font-semibold shadow-md'
                : 'text-white/60 font-medium hover:text-white hover:bg-white/5 hover:translate-x-1'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-[#B5923E] opacity-90" />
              )}
              <Settings
                size={18}
                className={clsx(
                  'flex-shrink-0 transition-colors relative z-10',
                  isActive ? 'text-white drop-shadow-sm' : 'text-white/40 group-hover:text-white/80'
                )}
              />
              <span className="relative z-10">Settings</span>
            </>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
