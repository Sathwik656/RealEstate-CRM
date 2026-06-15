import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserSquare2,
  Home,
  UserCircle,
  FileText,
  Search,
  TrendingUp,
  Bell,
  Download,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Properties', to: '/properties', icon: Building2 },
  { name: 'Sellers', to: '/sellers', icon: Users },
  { name: 'Buyers', to: '/buyers', icon: UserSquare2 },
  { name: 'Rentals', to: '/rentals', icon: Home },
  { name: 'Tenants', to: '/tenants', icon: UserCircle },
  { name: 'Leases', to: '/leases', icon: FileText },
  { name: 'Reminders', to: '/reminders', icon: Bell },
  { name: 'Global Search', to: '/search', icon: Search },
];

export function Sidebar() {
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
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #f0cc6e)' }}
          >
            <TrendingUp size={16} className="text-primary" />
          </div>
          <div>
            <h1 className="text-base font-display font-bold text-white leading-none">
              Veenu CRM
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
              Real Estate
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
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

      {/* App Download Link */}
      <div className="px-3 pb-4">
        <a
          href={import.meta.env.VITE_APP_DOWNLOAD_URL || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-white/80 hover:text-white hover:bg-white/10"
        >
          <Download
            size={18}
            className="flex-shrink-0 text-white/60 transition-colors group-hover:text-white/80"
          />
          <span>Download App</span>
        </a>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="text-[10px] text-white/25 text-center uppercase tracking-widest">
          Premium Real Estate Suite
        </div>
      </div>
    </aside>
  );
}
