import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Edit, Trash2 } from 'lucide-react';
import { EditAgent } from '@/components/forms/EditAgent';

export default function AgentsPage() {
  const [editingItem, setEditingItem] = useState<any>(null);
  
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
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agents</h1>
          <p className="page-subtitle">Manage registered agents in the CRM</p>
        </div>
      </div>
      <div className="card">
        <div className="card-header bg-surface-alt flex items-center justify-between">
          <span className="text-sm font-medium text-primary">All Agents</span>
          <span className="text-sm text-muted whitespace-nowrap">
            {data?.count ?? 0} agents
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="py-12 text-center text-muted">Loading...</td></tr>
              ) : !data?.data?.length ? (
                <tr><td colSpan={4} className="py-12 text-center text-muted">No agents found.</td></tr>
              ) : (
                data.data.map((agent: any) => (
                  <tr key={agent._id}>
                    <td>
                      <div className="font-semibold">{agent.name}</div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">{agent.code || '—'}</div>
                    </td>
                    <td className="text-muted">{agent.email}</td>
                    <td className="text-muted">{new Date(agent.createdAt).toLocaleDateString()}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn-icon hover:text-blue-600 hover:bg-blue-50" onClick={() => setEditingItem(agent)}>
                          <Edit size={15} />
                        </button>
                        <button className="btn-icon hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(agent._id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
