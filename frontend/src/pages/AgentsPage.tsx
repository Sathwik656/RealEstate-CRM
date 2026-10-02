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

import { Check, X } from 'lucide-react';

export default function AgentsPage() {
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list'|'grid'>((localStorage.getItem('crm_agentsView') as 'list'|'grid') || 'grid');
  const [activeTab, setActiveTab] = useState<'active'|'pending'>('active');

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

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/users/agents/${id}/approve`);
      refetch();
    } catch { alert('Failed to approve agent'); }
  };

  const handleReject = async (id: string) => {
    try {
      await api.put(`/users/agents/${id}/reject`);
      refetch();
    } catch { alert('Failed to reject agent'); }
  };

  const agentsList = data?.data || [];
  const activeAgents = agentsList.filter((a: any) => a.approvalStatus === 'approved' || !a.approvalStatus);
  const pendingAgents = agentsList.filter((a: any) => a.approvalStatus === 'pending');

  const getFiltered = (list: any[]) => list.filter((agent: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      agent.name?.toLowerCase().includes(q) ||
      agent.code?.toLowerCase().includes(q) ||
      agent.email?.toLowerCase().includes(q) ||
      agent.phone?.toLowerCase().includes(q)
    );
  });

  const filteredActiveAgents = getFiltered(activeAgents);
  const filteredPendingAgents = getFiltered(pendingAgents);
  const currentList = activeTab === 'active' ? filteredActiveAgents : filteredPendingAgents;

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
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-display font-semibold text-primary mb-1">Agents</h1>
          <p className="text-muted">Manage your team of real estate agents.</p>
        </div>
      </div>
      
      
      <div className="card">
        <div className="card-header bg-surface-alt flex flex-col xl:flex-row gap-3 xl:items-center justify-between">
          {/* Tabs */}
          <div className="flex gap-4 border-b border-border">
            <button
              onClick={() => setActiveTab('active')}
              className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === 'active' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              Active Agents
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'pending' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              Pending Approvals
              {pendingAgents.length > 0 && (
                <span className="bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-[10px]">
                  {pendingAgents.length}
                </span>
              )}
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex flex-row flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-muted" />
              </div>
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); }}
                className="form-input pl-10 w-full"
              />
            </div>
            <span className="text-sm text-muted whitespace-nowrap flex-1 sm:flex-none">
              {currentList.length} agent{currentList.length === 1 ? '' : 's'}
            </span>
            <div className="flex justify-end">
              <ViewToggle view={view} onChange={handleViewChange} />
            </div>
          </div>
        </div>
        
        {view === 'grid' ? (
          <div className="p-4 sm:p-6 bg-surface">
            {isLoading ? (
              <GridSkeleton count={6} />
            ) : !currentList.length ? (
              <EmptyState title={`No ${activeTab} agents found`} description="There are no agents matching your criteria." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentList.map((agent: any) => (
                  <AgentCard 
                    key={agent._id} 
                    agent={agent} 
                    onEdit={() => setEditingItem(agent)} 
                    onDelete={() => handleDelete(agent._id)} 
                    isPending={activeTab === 'pending'}
                    onApprove={activeTab === 'pending' ? () => handleApprove(agent._id) : undefined}
                    onReject={activeTab === 'pending' ? () => handleReject(agent._id) : undefined}
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
                ) : !currentList.length ? (
                  <tr><td colSpan={5} className="py-12 text-center text-muted">No agents found.</td></tr>
                ) : currentList.map((agent: any) => (
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
                      {/* <div className="text-sm">{agent.email}</div> */}
                      {agent.phone && <div className="text-xs text-muted">{agent.phone}</div>}
                    </td>
                    <td className="font-medium text-[#c4a47c]">{agent.propertiesSold || 0}</td>
                    <td className="font-medium text-[#c4a47c]">₹{(agent.revenue || 0).toLocaleString('en-IN')}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        {activeTab === 'pending' ? (
                          <>
                            <button 
                              onClick={() => handleApprove(agent._id)} 
                              className="btn-icon hover:text-emerald-600 hover:bg-emerald-50 text-emerald-500"
                              title="Approve"
                            >
                              <Check size={15} />
                            </button>
                            <button 
                              onClick={() => handleReject(agent._id)} 
                              className="btn-icon hover:text-red-600 hover:bg-red-50 text-red-500"
                              title="Reject"
                            >
                              <X size={15} />
                            </button>
                          </>
                        ) : null}
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
    
    </>
  );
}
