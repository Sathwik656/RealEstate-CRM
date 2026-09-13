import { Eye, Edit, Trash2, Mail, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function AgentCard({ agent, onView, onEdit, onDelete }: any) {
  const navigate = useNavigate();
  
  const handleView = () => {
    if (onView) onView();
    else navigate(`/agents/${agent._id}`);
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-all p-6 relative group h-full flex flex-col cursor-pointer" onClick={handleView}>
      
      {/* Action Menu (Visible on hover) */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-border/50" onClick={(e) => e.stopPropagation()}>
        <Link 
          to={`/agents/${agent._id}`}
          className="p-1.5 text-muted hover:text-accent rounded-md transition-colors"
          title="View Details"
        >
          <Eye size={16} />
        </Link>
        <button 
          onClick={onEdit} 
          className="p-1.5 text-muted hover:text-blue-600 rounded-md transition-colors"
          title="Edit Agent"
        >
          <Edit size={16} />
        </button>
        <button 
          onClick={onDelete} 
          className="p-1.5 text-muted hover:text-red-600 rounded-md transition-colors"
          title="Delete Agent"
        >
          <Trash2 size={16} />
        </button>
      </div>

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
          {agent.code && (
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
        {agent.phone && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Phone size={14} className="shrink-0" />
            <span>{agent.phone}</span>
          </div>
        )}
      </div>

      <hr className="border-border/60 mb-4 mt-auto" />

      {/* Stats Footer */}
      <div className="flex items-center justify-between">
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

    </div>
  );
}
