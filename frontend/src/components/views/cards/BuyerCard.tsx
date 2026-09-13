import { Eye, Edit, Phone, MapPin, Tag } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';

export function BuyerCard({ buyer: b, onView, onEdit }: any) {
  const { user } = useAuth();
  
  return (
    <div 
      className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-all p-5 flex flex-col h-full cursor-pointer"
      onClick={onView}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-surface-alt flex items-center justify-center text-primary font-display font-semibold shrink-0">
            {b.buyerName?.charAt(0).toUpperCase() || 'B'}
          </div>
          <div>
            <h3 className="font-semibold text-primary line-clamp-1">{b.buyerName}</h3>
            <div className="text-[10px] text-muted font-mono">{b.code}</div>
          </div>
        </div>
        <span className={clsx('badge text-[10px]',
          b.status === 'Active' ? 'badge-green' :
          b.status === 'Closed' ? 'badge-red' :
          b.status === 'Follow-up' ? 'badge-amber' : 'badge-gray'
        )}>
          {b.status || 'Active'}
        </span>
      </div>
      
      <div className="space-y-3 mb-4 flex-grow">
        {b.contactNumber && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Phone size={12} className="shrink-0" />
            <span className="truncate">{b.contactNumber}</span>
          </div>
        )}
        
        {b.preferredLocation && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">Prefers: {b.preferredLocation}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted">
          <Tag size={12} className="shrink-0" />
          <span className="truncate">
            {b.purpose ? `${b.purpose}` : 'Any'} {b.bhkRequirement ? ` · ${b.bhkRequirement} BHK` : ''}
          </span>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Budget</div>
        <div className="font-display font-semibold text-primary">
          {b.budgetMax ? `₹${b.budgetMax.toLocaleString('en-IN')}` : 'Not Specified'}
        </div>
      </div>

      {b.referredByAgentId?.name && (
        <div className="text-[11px] text-muted mb-4 bg-surface p-1.5 rounded inline-flex w-fit">
          Ref: <span className="font-medium text-primary ml-1">{b.referredByAgentId.name}</span>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-border flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          className="btn-icon hover:text-accent hover:bg-accent/10"
          title="View details"
          onClick={onView}
        >
          <Eye size={15} />
        </button>
        {user?.role === 'admin' && (
          <button
            className="btn-icon hover:text-blue-600 hover:bg-blue-50"
            title="Edit"
            onClick={onEdit}
          >
            <Edit size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
