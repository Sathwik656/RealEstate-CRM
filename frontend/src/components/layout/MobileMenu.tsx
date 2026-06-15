import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  UserSquare2,
  Home,
  UserCircle,
  FileText,
  LogOut,
  X,
  TrendingUp,
  Bell,
  Download,
} from 'lucide-react';
import clsx from 'clsx';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { name: 'Sellers', to: '/sellers', icon: Users },
  { name: 'Buyers', to: '/buyers', icon: UserSquare2 },
  { name: 'Rentals', to: '/rentals', icon: Home },
  { name: 'Tenants', to: '/tenants', icon: UserCircle },
  { name: 'Leases', to: '/leases', icon: FileText },
  { name: 'Reminders', to: '/reminders', icon: Bell },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user, logout } = useAuth();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 lg:hidden animate-fade-in"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div 
        className={clsx(
          "fixed bottom-0 left-0 right-0 bg-surface rounded-t-2xl z-50 lg:hidden transform transition-transform duration-300 ease-out flex flex-col max-h-[85vh]",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <TrendingUp size={16} className="text-accent" />
            </div>
            <div>
              <h3 className="font-display font-bold text-primary leading-none">Veenu CRM</h3>
              <p className="text-xs text-muted mt-0.5">{user?.name || 'Admin'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted hover:text-primary transition-colors bg-surface-alt rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Links */}
        <div className="overflow-y-auto p-4 space-y-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 px-2">More Modules</p>
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-primary hover:bg-surface-alt'
                )
              }
            >
              <item.icon size={20} className="text-muted" />
              <span>{item.name}</span>
            </NavLink>
          ))}

          <div className="my-4 border-t border-border" />

          <a
            href={import.meta.env.VITE_APP_DOWNLOAD_URL || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-primary hover:bg-surface-alt transition-colors"
          >
            <Download size={20} className="text-muted" />
            <span>Download App</span>
          </a>

          <button
            onClick={() => { onClose(); logout(); }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
