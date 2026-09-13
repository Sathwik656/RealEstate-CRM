import { List, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';

interface ViewToggleProps {
  view: 'list' | 'grid';
  onChange: (view: 'list' | 'grid') => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center p-0.5 bg-surface-alt border border-border rounded-lg">
      <button
        type="button"
        onClick={() => onChange('list')}
        className={clsx(
          "p-1.5 rounded-md flex items-center justify-center transition-colors",
          view === 'list' 
            ? "bg-white shadow-sm text-primary" 
            : "text-muted hover:text-primary"
        )}
        title="List View"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={clsx(
          "p-1.5 rounded-md flex items-center justify-center transition-colors",
          view === 'grid' 
            ? "bg-white shadow-sm text-primary" 
            : "text-muted hover:text-primary"
        )}
        title="Grid View"
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}
