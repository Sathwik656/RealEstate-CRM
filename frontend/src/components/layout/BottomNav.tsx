import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Search, Menu } from 'lucide-react';
import clsx from 'clsx';

interface BottomNavProps {
  onMenuClick: () => void;
}

const navItems = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Properties', to: '/properties', icon: Building2 },
  { name: 'Search', to: '/search', icon: Search },
];

export function BottomNav({ onMenuClick }: BottomNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around z-40 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.to}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors',
              isActive ? 'text-accent' : 'text-muted hover:text-primary'
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon size={20} className={isActive ? 'text-accent' : 'text-muted'} />
              <span className={clsx('text-[10px] font-medium', isActive ? 'text-accent' : 'text-muted')}>
                {item.name}
              </span>
            </>
          )}
        </NavLink>
      ))}

      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted hover:text-primary transition-colors"
      >
        <Menu size={20} />
        <span className="text-[10px] font-medium">Menu</span>
      </button>
    </nav>
  );
}
