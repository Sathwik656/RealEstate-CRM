import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Eye, Mail, Phone, Search, ChevronRight, UserCog } from 'lucide-react';
import { EditAgent } from '@/components/forms/EditAgent';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { EmptyState } from '@/components/ui/EmptyState';
import { GridSkeleton } from '@/components/ui/GridSkeleton';
import { AgentCard } from '@/components/views/cards/AgentCard';

export default function AgentsPage() {
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list'|'grid'>((localStorage.getItem('crm_agentsView') as 'list'|'grid') || 'grid');

  const handleViewChange = (v: 'list'|'grid') => {
    setView(v);
    localStorage.setItem('crm_agentsView', v);
  };
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await api.get('/users/agents');
      return res.data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this agent? This action cannot be undone.')) return;
    try { 
      await api.delete(`/users/agents/${id}`); 
      refetch(); 
    }
    catch { alert('Failed to delete agent'); }
  };

  const agentsList = data?.data || [];
  const filteredAgents = agentsList.filter((agent: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      agent.name?.toLowerCase().includes(q) ||
      agent.code?.toLowerCase().includes(q) ||
      agent.email?.toLowerCase().includes(q) ||
      agent.phone?.toLowerCase().includes(q)
    );
  });

  const getInitials = (name?: string) => {
    if (!name) return 'AG';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (editingItem) {
    return (
      <EditAgent 
        initialData={editingItem} 
        onSuccess={() => { setEditingItem(null); refetch(); }} 
        onCancel={() => { setEditingItem(null); }} 
      />
    );
  }

  return (
    <>
    <div className="hidden lg:block page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-display font-semibold text-primary mb-1">Agents</h1>
          <p className="text-muted">Manage your team of real estate agents.</p>
        </div>
      </div>
      
      
      <div className="card">
        <div className="card-header bg-surface-alt flex items-center justify-between">
          <span className="text-sm text-muted whitespace-nowrap">
            {data?.data?.length ?? 0} agents
          </span>
          <ViewToggle view={view} onChange={handleViewChange} />
        </div>
        
        {view === 'grid' ? (
          <div className="p-4 sm:p-6 bg-surface">
            {isLoading ? (
              <GridSkeleton count={6} />
            ) : !data?.data?.length ? (
              <EmptyState title="No agents found" description="There are no agents in the system." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {data.data.map((agent: any) => (
                  <AgentCard 
                    key={agent._id} 
                    agent={agent} 
                    onView={() => {}} 
                    onEdit={() => setEditingItem(agent)} 
                    onDelete={() => handleDelete(agent._id)} 
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Contact</th>
                  <th>Properties Sold</th>
                  <th>Revenue</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-muted">Loading agents...</td></tr>
                ) : !data?.data?.length ? (
                  <tr><td colSpan={5} className="py-12 text-center text-muted">No agents found.</td></tr>
                ) : data.data.map((agent: any) => (
                  <tr key={agent._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-[#c4a47c] shrink-0 bg-surface">
                          <img 
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${agent.name}&backgroundColor=c4a47c&textColor=ffffff`} 
                            alt={agent.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-primary">{agent.name}</div>
                          <div className="text-[10px] text-muted font-mono">{agent.code}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{agent.email}</div>
                      {agent.phone && <div className="text-xs text-muted">{agent.phone}</div>}
                    </td>
                    <td className="font-medium text-[#c4a47c]">{agent.propertiesSold || 0}</td>
                    <td className="font-medium text-[#c4a47c]">₹{(agent.revenue || 0).toLocaleString('en-IN')}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link 
                          to={`/agents/${agent._id}`}
                          className="btn-icon hover:text-accent hover:bg-accent/10"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </Link>
                        <button 
                          onClick={() => setEditingItem(agent)} 
                          className="btn-icon hover:text-blue-600 hover:bg-blue-50"
                          title="Edit Agent"
                        >
                          <Edit size={15} />
                        </button>
                        <button 
                          onClick={() => handleDelete(agent._id)} 
                          className="btn-icon hover:text-red-600 hover:bg-red-50"
                          title="Delete Agent"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    
    {/* Mobile UI */}
    <div className="block lg:hidden w-full pb-20 font-sans">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agents</h1>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {filteredAgents.length} Agent{filteredAgents.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents by name, code, email..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:border-[#B5923E]"
          />
        </div>
      </div>

      {/* Agents Card List */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading agents...</span>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="py-14 px-4 bg-white rounded-2xl border border-slate-100 text-center flex flex-col items-center">
            <UserCog size={32} className="text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-800">
              {searchQuery ? 'No matching agents' : 'No agents found'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery ? 'Try adjusting your search terms.' : 'There are no agents in the system.'}
            </p>
          </div>
        ) : (
          filteredAgents.map((agent: any) => (
            <div 
              key={agent._id} 
              className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-3 transition-all"
            >
              {/* Header: Avatar, Name, Code */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#B5923E]/10 border border-[#B5923E]/30 text-[#B5923E] font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {getInitials(agent.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{agent.name}</h3>
                    <p className="text-[11px] font-mono text-[#B5923E] font-semibold mt-0.5">{agent.code || 'NO-CODE'}</p>
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingItem(agent)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 active:scale-95 transition-all"
                    title="Edit Agent"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(agent._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all"
                    title="Delete Agent"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={13} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{agent.email}</span>
                </div>
                {agent.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={13} className="text-slate-400 flex-shrink-0" />
                    <span>{agent.phone}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                {/* Stats */}
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Properties Sold</span>
                    <span className="text-sm font-bold text-[#B5923E]">{agent.propertiesSold || 0}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Revenue</span>
                    <span className="text-sm font-bold text-[#B5923E]">₹{(agent.revenue || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* View Details Link */}
                <Link
                  to={`/agents/${agent._id}`}
                  className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-[#B5923E] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 active:scale-95 transition-all"
                >
                  <span>View</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </>
  );
}
