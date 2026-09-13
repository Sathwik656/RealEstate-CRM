import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  UserSquare2,
  UserCog,
  FileText,
  LogOut,
  X,
  Settings,
  ClipboardCheck,
  Handshake,
} from 'lucide-react';
import clsx from 'clsx';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user, logout } = useAuth();
  
  if (!isOpen) return null;

  const isAdmin = user?.role === 'admin';

  const adminGroups = [
    {
      title: 'CRM',
      items: [
        { name: 'Sellers', to: '/sellers', icon: Users },
        { name: 'Buyers', to: '/buyers', icon: UserSquare2 },
      ]
    },
    {
      title: 'Operations',
      items: [
        { name: 'Allotments', to: '/allotments', icon: ClipboardCheck },
        { name: 'Deal Approvals', to: '/deal-approvals', icon: ClipboardCheck },
      ]
    },
    {
      title: 'Management',
      items: [
        { name: 'Reports', to: '/reports', icon: FileText },
        { name: 'Agents', to: '/agents', icon: UserCog },
        { name: 'Settings', to: '/settings', icon: Settings },
      ]
    }
  ];

  const agentGroups = [
    {
      title: 'CRM',
      items: [
        { name: 'Sellers', to: '/sellers', icon: Users },
        { name: 'Buyers', to: '/buyers', icon: UserSquare2 },
      ]
    },
    {
      title: 'Operations',
      items: [
        { name: 'My Deals', to: '/deals', icon: Handshake },
      ]
    },
    {
      title: 'Management',
      items: [
        { name: 'Settings', to: '/settings', icon: Settings },
      ]
    }
  ];

  const groups = isAdmin ? adminGroups : agentGroups;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[60] lg:hidden animate-fade-in"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div 
        className={clsx(
          "fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl z-[70] lg:hidden transform transition-transform duration-300 ease-out flex flex-col max-h-[90vh] shadow-2xl pb-safe",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle indicator */}
        <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
              <img src="/logo.png" alt="Logo" className="w-6 h-auto object-contain" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 tracking-tight leading-none text-lg">Menu</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">{user?.name || 'Admin'} • {user?.role || 'User'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-full active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Links */}
        <div className="overflow-y-auto px-4 py-4 space-y-4">
          {groups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">{group.title}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]',
                      isActive
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-50'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={20} className={isActive ? "text-white" : "text-slate-400"} />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}

          <div className="my-5 mx-2 border-t border-slate-100" />

          <button
            onClick={() => { onClose(); logout(); }}
            className="w-full flex items-center gap-4 px-4 py-3.5 mt-2 rounded-2xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all active:scale-[0.98]"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
