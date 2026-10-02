import { Eye, Edit, Trash2, Mail, Phone, Check, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function AgentCard({ agent, onView, onEdit, onDelete, isPending, onApprove, onReject }: any) {
  const navigate = useNavigate();
  
  const handleView = () => {
    if (onView) onView();
    else navigate(`/agents/${agent._id}`);
  };

  return (
    <div 
      className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-all p-5 flex flex-col h-full cursor-pointer"
      onClick={handleView}
    >
      
      {/* Header: Avatar & Name */}
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 bg-surface flex items-center justify-center">
            <img 
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${agent.name}&backgroundColor=c4a47c&textColor=ffffff`} 
              alt={agent.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 pt-1">
            <h3 className="font-semibold text-primary truncate" title={agent.name}>{agent.name}</h3>
            {agent.code && !isPending && (
              <div className="text-[10px] text-muted font-mono truncate">{agent.code}</div>
            )}
          </div>
        </div>
        {/* We can optionally add a badge here if required in the future */}
      </div>

      {/* Contact Info */}
      <div className="space-y-3 mb-4 flex-grow">
        {/* Agent Email Hidden */}
        {agent.phone && !isPending && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Phone size={12} className="shrink-0" />
            <span>{agent.phone}</span>
          </div>
        )}
      </div>

      {/* Stats Footer (Hidden if Pending) */}
      {!isPending && (
        <div className="flex items-center gap-6 mb-4">
          <div className="flex-1 border-r border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Properties Sold</div>
            <div className="font-display font-semibold text-primary">{agent.propertiesSold || 0}</div>
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Revenue</div>
            <div className="font-display font-semibold text-primary">
              ₹{(agent.revenue || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-border flex w-full" onClick={(e) => e.stopPropagation()}>
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
