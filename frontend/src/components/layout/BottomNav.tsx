import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Handshake, ClipboardCheck, Menu } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';

interface BottomNavProps {
  onMenuClick?: () => void;
}

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const agentItems = [
    { name: 'Home', to: '/dashboard', icon: LayoutDashboard, isAction: false },
    { name: 'Properties', to: '/properties', icon: Building2, isAction: false },
    { name: 'Deals', to: '/deals', icon: Handshake, isAction: false },
    { name: 'More', to: '#', icon: Menu, isAction: true },
  ];

  const adminItems = [
    { name: 'Home', to: '/dashboard', icon: LayoutDashboard, isAction: false },
    { name: 'Properties', to: '/properties', icon: Building2, isAction: false },
    { name: 'Allotments', to: '/allotments', icon: ClipboardCheck, isAction: false },
    { name: 'More', to: '#', icon: Menu, isAction: true },
  ];

  const items = isAdmin ? adminItems : agentItems;

  return (
    <nav className="w-full bg-white border-t border-slate-100 flex justify-around py-3 pb-safe">
      {items.map((item) => {
        if (item.isAction) {
          return (
            <button
              key={item.name}
              onClick={onMenuClick}
              className="flex flex-col items-center justify-center space-y-1 transition-colors text-slate-400 hover:text-slate-600"
            >
              <item.icon size={22} className="text-slate-400" strokeWidth={2} />
              <span className="text-[10px] font-medium tracking-tight text-slate-400">
                {item.name}
              </span>
            </button>
          );
        }

        return (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center space-y-1 transition-colors',
                isActive ? 'text-black' : 'text-slate-400 hover:text-slate-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={22} className={isActive ? 'text-black' : 'text-slate-400'} strokeWidth={isActive ? 2.5 : 2} />
                <span className={clsx('text-[10px] font-medium tracking-tight', isActive ? 'text-black font-semibold' : 'text-slate-400')}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
