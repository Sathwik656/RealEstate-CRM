import { Eye, Edit, Trash2, Mail, Phone, Check, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function AgentCard({ agent, onView, onEdit, onDelete, isPending, onApprove, onReject }: any) {
  const navigate = useNavigate();
  
  const handleView = () => {
    if (onView) onView();
    else navigate(`/agents/${agent._id}`);
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-all p-6 relative group h-full flex flex-col cursor-pointer" onClick={handleView}>
      
      {/* Header: Avatar & Name */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 rounded-full overflow-hidden border-[3px] border-[#c4a47c] shrink-0 bg-surface flex items-center justify-center">
          <img 
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${agent.name}&backgroundColor=c4a47c&textColor=ffffff`} 
            alt={agent.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <h3 className="text-xl font-display font-semibold text-primary line-clamp-1" title={agent.name}>{agent.name}</h3>
          {agent.code && !isPending && (
            <span className="text-xs text-muted font-mono mt-0.5 block">{agent.code}</span>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-6 flex-grow">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Mail size={14} className="shrink-0" />
          <span className="truncate" title={agent.email}>{agent.email}</span>
        </div>
        {agent.phone && !isPending && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Phone size={14} className="shrink-0" />
            <span>{agent.phone}</span>
          </div>
        )}
      </div>

      <hr className="border-border/60 mb-4 mt-auto" />

      {/* Stats Footer (Hidden if Pending) */}
      {!isPending && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold tracking-wider text-muted uppercase mb-1">Properties Sold</p>
            <p className="text-xl font-display font-bold text-[#c4a47c]">{agent.propertiesSold || 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-muted uppercase mb-1">Revenue</p>
            <p className="text-xl font-display font-bold text-[#c4a47c]">
              ₹{(agent.revenue || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-border flex w-full" onClick={(e) => e.stopPropagation()}>
        {isPending ? (
          <>
            {onApprove && (
              <button
                className="flex-1 flex justify-center items-center py-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                title="Approve"
                onClick={onApprove}
              >
                <Check size={16} />
              </button>
            )}
            {onReject && (
              <button
                className="flex-1 flex justify-center items-center py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Reject"
                onClick={onReject}
              >
                <X size={16} />
              </button>
            )}
          </>
        ) : null}
        
        <button
          className="flex-1 flex justify-center items-center py-2 text-muted hover:text-accent hover:bg-accent/10 rounded transition-colors"
          title="View details"
          onClick={handleView}
        >
          <Eye size={16} />
        </button>
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
      </div>

    </div>
  );
}
