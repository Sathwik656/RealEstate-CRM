import { Eye, Edit, Handshake, MapPin, Tag, Square, Trash2, CheckCircle, Home } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';

export function PropertyCard({ 
  property: p, 
  onView, 
  onEdit, 
  onExpressInterest,
  expressingInterestId,
  isExpressInterestPending,
  onDelete,
  onDirectSell,
  isDirectSellPending
}: any) {
  const { user } = useAuth();
  
  return (
    <div 
      className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col h-full cursor-pointer overflow-hidden"
      onClick={onView}
    >
      {/* Property Image Header */}
      <div className="relative h-40 bg-slate-100 flex-shrink-0 w-full overflow-hidden">
        {p.images && p.images.length > 0 ? (
          <img src={p.images[0].url} alt={p.propertyTitle} className="w-full h-full object-cover transition-transform hover:scale-105" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100/80">
            <Home size={32} className="mb-2 opacity-50" />
            <span className="text-xs font-medium uppercase tracking-wider">No Image</span>
          </div>
        )}
        
        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
          <div className="shrink-0">
            {p.approvalStatus === 'pending' ? (
              <span className="badge badge-amber text-[10px] whitespace-nowrap shadow-sm">⏳ Pending Approval</span>
            ) : (
              <span className={clsx('badge text-[10px] whitespace-nowrap shadow-sm backdrop-blur-sm bg-white/90',
                p.propertyStatus === 'Available' ? 'badge-green' :
                p.propertyStatus === 'In Allotment' ? 'badge-blue' :
                p.propertyStatus === 'In Deal' ? 'badge-amber' :
                p.propertyStatus === 'Sold' ? 'badge-red' : 'badge-gray'
              )}>
                {p.propertyStatus}
              </span>
            )}
          </div>
          <div className="bg-black/60 text-white backdrop-blur-sm rounded-md px-2 py-1 text-[10px] font-mono whitespace-nowrap shadow-sm">{p.code}</div>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
      
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

      <div className="mb-4 mt-auto">
        <div className="text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Price</div>
        <div className="font-display font-semibold text-primary text-lg">
          ₹{p.price?.toLocaleString('en-IN')}
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-border flex w-full" onClick={(e) => e.stopPropagation()}>
        <button
          className="flex-1 flex justify-center items-center py-2 text-muted hover:text-accent hover:bg-accent/10 rounded transition-colors"
          title="View details"
          onClick={onView}
        >
          <Eye size={16} />
        </button>
        
        {user?.role === 'agent' && (p.propertyStatus === 'Available' || p.propertyStatus === 'In Allotment') && p.approvalStatus !== 'pending' && (
          (p.createdByUserId?._id === user?._id || p.createdByUserId === user?._id || p.referredByAgentId?._id === user?._id || p.referredByAgentId === user?._id) && onDirectSell ? (
            <button
              className="flex-1 flex justify-center items-center py-2 text-accent hover:bg-accent/10 rounded transition-colors"
              title="Mark this property as sold independently"
              disabled={isDirectSellPending}
              onClick={(e) => { e.stopPropagation(); onDirectSell(p._id); }}
            >
              <CheckCircle size={16} />
            </button>
          ) : (
            <button
              className={clsx("flex-1 flex justify-center items-center py-2 rounded transition-colors gap-1.5", p.isApplied ? "bg-emerald-500/10 text-emerald-600 cursor-default" : "text-amber-500 hover:bg-amber-50 disabled:opacity-50")}
              title={p.isApplied ? "You have already applied" : "Express interest in this property"}
              disabled={p.isApplied || expressingInterestId === p._id || isExpressInterestPending}
              onClick={(e) => { e.stopPropagation(); !p.isApplied && onExpressInterest && onExpressInterest(p._id); }}
            >
              <Handshake size={16} />
            </button>
          )
        )}
        
        {(user?.role === 'admin' || p.createdByUserId?._id === user?._id || p.createdByUserId === user?._id) && (
          <>
            <button
              className="flex-1 flex justify-center items-center py-2 text-muted hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit"
              onClick={onEdit}
            >
              <Edit size={16} />
            </button>
            {onDelete && (
              <button
                className="flex-1 flex justify-center items-center py-2 text-muted hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
    </div>
  );
}
