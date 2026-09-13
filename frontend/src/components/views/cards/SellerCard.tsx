import { Eye, Edit, Phone, Mail, Home } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function SellerCard({ seller: s, onView, onEdit }: any) {
  const { user } = useAuth();
  
  return (
    <div 
      className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-all p-5 flex flex-col h-full cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="h-10 w-10 rounded-full bg-surface-alt flex items-center justify-center text-primary font-display font-semibold shrink-0">
          {s.sellerName?.charAt(0).toUpperCase() || 'S'}
        </div>
        <div>
          <h3 className="font-semibold text-primary line-clamp-1">{s.sellerName}</h3>
          <div className="text-[10px] text-muted font-mono">{s.code}</div>
        </div>
      </div>
      
      <div className="space-y-2 mb-4 flex-grow">
        {s.contactNumber && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Phone size={12} className="shrink-0" />
            <span className="truncate">{s.contactNumber}</span>
          </div>
        )}
        {s.email && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Mail size={12} className="shrink-0" />
            <span className="truncate">{s.email}</span>
          </div>
        )}
        {/* If propertiesCount exists we display it, although standard api might not return it unless populated */}
        {s.propertiesCount !== undefined && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Home size={12} className="shrink-0" />
            <span>{s.propertiesCount} Properties</span>
          </div>
        )}
      </div>

      {s.referredByAgentId?.name && (
        <div className="text-[11px] text-muted mb-4 bg-surface p-1.5 rounded inline-flex w-fit">
          Ref: <span className="font-medium text-primary ml-1">{s.referredByAgentId.name}</span>
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
