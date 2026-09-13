import { Eye, Edit, Handshake, MapPin, Tag, Square } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';

export function PropertyCard({ 
  property: p, 
  onView, 
  onEdit, 
  onExpressInterest,
  expressingInterestId,
  isExpressInterestPending
}: any) {
  const { user } = useAuth();
  
  return (
    <div 
      className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-all p-5 flex flex-col h-full cursor-pointer"
      onClick={onView}
    >
      <div className="flex justify-between items-start mb-3">
        <span className={clsx('badge text-[10px]',
          p.propertyStatus === 'Available' ? 'badge-green' :
          p.propertyStatus === 'In Allotment' ? 'badge-blue' :
          p.propertyStatus === 'In Deal' ? 'badge-amber' :
          p.propertyStatus === 'Sold' ? 'badge-red' : 'badge-gray'
        )}>
          {p.propertyStatus}
        </span>
        <div className="text-[10px] text-muted font-mono">{p.code}</div>
      </div>
      
      <h3 className="font-semibold text-primary text-lg mb-2 line-clamp-1" title={p.propertyTitle}>
        {p.propertyTitle}
      </h3>
      
      <div className="flex items-center gap-1.5 text-muted text-xs mb-3">
        <MapPin size={12} className="shrink-0" />
        <span className="truncate">{p.location?.location || p.location}</span>
      </div>

      <div className="flex items-center gap-3 text-xs mb-3">
        <div className="flex items-center gap-1 text-muted">
          <Tag size={12} /> {p.propertyType} {p.purpose ? `· ${p.purpose}` : ''}
        </div>
        {p.area && (
          <div className="flex items-center gap-1 text-muted">
            <Square size={12} /> {p.area.toLocaleString()} sqft
          </div>
        )}
      </div>

      {p.referredByAgentId?.name && (
        <div className="text-[11px] text-muted mb-3 bg-surface p-1.5 rounded inline-flex w-fit">
          Ref: <span className="font-medium text-primary ml-1">{p.referredByAgentId.name}</span>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
        <div className="font-display font-semibold text-primary">
          ₹{p.price?.toLocaleString('en-IN')}
        </div>
        
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn-icon hover:text-accent hover:bg-accent/10"
            title="View details"
            onClick={onView}
          >
            <Eye size={15} />
          </button>
          
          {user?.role === 'agent' && (p.propertyStatus === 'Available' || p.propertyStatus === 'In Allotment') && (
            <button
              className={clsx("btn btn-sm px-2 ml-1", p.isApplied ? "bg-emerald-500/10 text-emerald-600 cursor-default hover:bg-emerald-500/10" : "bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50")}
              title={p.isApplied ? "You have already applied" : "Express interest in this property"}
              disabled={p.isApplied || expressingInterestId === p._id || isExpressInterestPending}
              onClick={() => !p.isApplied && onExpressInterest && onExpressInterest(p._id)}
            >
              <Handshake size={13} />
            </button>
          )}
          
          {user?.role === 'admin' && (
            <>
              <button
                className="btn-icon hover:text-blue-600 hover:bg-blue-50"
                title="Edit"
                onClick={onEdit}
              >
                <Edit size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
