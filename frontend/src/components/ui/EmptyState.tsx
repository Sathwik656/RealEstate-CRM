import { SearchX } from 'lucide-react';
import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-surface border border-dashed border-border rounded-xl">
      <div className="h-12 w-12 rounded-full bg-surface-alt flex items-center justify-center text-muted mb-4">
        <SearchX size={24} />
      </div>
      <h3 className="text-sm font-semibold text-primary mb-1">{title}</h3>
      <p className="text-xs text-muted max-w-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
