import { Eye, Edit, Phone, MapPin, Tag, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';

export function BuyerCard({ buyer: b, onView, onEdit, onDelete }: any) {
  const { user } = useAuth();
  
  return (
    <div 
      className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-all p-5 flex flex-col h-full cursor-pointer"
      onClick={onView}
    >
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-surface-alt flex items-center justify-center text-primary font-display font-semibold shrink-0">
            {b.buyerName?.charAt(0).toUpperCase() || 'B'}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-primary truncate">{b.buyerName}</h3>
            <div className="text-[10px] text-muted font-mono truncate">{b.code}</div>
          </div>
        </div>
        <span className={clsx('badge text-[10px] shrink-0',
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
            {b.purpose ? `${b.purpose}` : 'Any'} {b.propertyTypeInterested ? ` · ${b.propertyTypeInterested}` : ''} {b.bhkRequirement ? ` · ${b.bhkRequirement} BHK` : ''} {b.areaRequirement ? ` · ${b.areaRequirement.toLocaleString('en-IN')} sq ft` : ''}
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

      <div className="mt-auto pt-3 border-t border-border flex w-full" onClick={(e) => e.stopPropagation()}>
        <button
          className="flex-1 flex justify-center items-center py-2.5 sm:py-2 text-muted hover:text-accent hover:bg-accent/10 rounded transition-colors"
          title="View details"
          onClick={onView}
        >
          <Eye size={16} />
        </button>
        {(user?.role === 'admin' || b.referredByAgentId?._id === user?._id || b.referredByAgentId === user?._id) && (
          <>
            <button
              className="flex-1 flex justify-center items-center py-2.5 sm:py-2 text-muted hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit"
              onClick={onEdit}
            >
              <Edit size={16} />
            </button>
            {onDelete && (
              <button
                className="flex-1 flex justify-center items-center py-2.5 sm:py-2 text-muted hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
                onClick={onDelete}
              >
                <Trash2 size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
