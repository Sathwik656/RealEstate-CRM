import { Eye, Edit, Phone, Mail, Home, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function SellerCard({ seller: s, onView, onEdit, onDelete }: any) {
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

      <div className="mt-auto pt-3 border-t border-border flex w-full" onClick={(e) => e.stopPropagation()}>
        <button
          className="flex-1 flex justify-center items-center py-2 text-muted hover:text-accent hover:bg-accent/10 rounded transition-colors"
          title="View details"
          onClick={onView}
        >
          <Eye size={16} />
        </button>
        {user?.role === 'admin' && (
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
  );
}
