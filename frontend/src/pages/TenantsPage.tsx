import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { CreateTenant } from '@/components/forms/CreateTenant';

export default function TenantsPage() {
  const [page, setPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tenants', page],
    queryFn: async () => (await api.get('/tenants', { params: { page, limit: 10 } })).data,
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this tenant?')) return;
    try { await api.delete(`/tenants/${id}`); refetch(); }
    catch { alert('Failed to delete tenant'); }
  };

  if (isCreating) return <CreateTenant onSuccess={() => { setIsCreating(false); refetch(); }} onCancel={() => setIsCreating(false)} />;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Tenants</h1><p className="page-subtitle">Manage prospective and current tenants</p></div>
        <button className="btn-accent" onClick={() => setIsCreating(true)}><Plus size={16} /> Add Tenant</button>
      </div>
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Tenant ID</th><th>Name</th><th>Contact</th><th>Location Pref.</th><th>Budget</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="py-12 text-center text-muted">Loading...</td></tr>
               : !data?.data?.length ? <tr><td colSpan={7} className="py-12 text-center text-muted">No tenants found.</td></tr>
               : data.data.map((t: any) => (
                <tr key={t._id}>
                  <td><span className="font-mono text-xs text-muted">{t.tenantId}</span></td>
                  <td className="font-semibold">{t.tenantName}</td>
                  <td className="text-muted">{t.contactNumber}</td>
                  <td className="text-muted">{t.preferredLocation}</td>
                  <td className="font-medium">₹{t.budgetRange?.toLocaleString('en-IN') || 'N/A'}</td>
                  <td><span className={t.status === 'Active' ? 'badge-green' : 'badge-gray'}>{t.status}</span></td>
                  <td className="text-right"><div className="flex justify-end gap-1">
                    <button className="btn-icon hover:text-blue-600 hover:bg-blue-50"><Edit size={15} /></button>
                    <button className="btn-icon hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(t._id)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.pagination?.pages > 1 && (
          <div className="pagination">
            <span className="text-sm text-muted">Page {data.pagination.page} of {data.pagination.pages}</span>
            <div className="flex gap-2">
              <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="pagination-btn" disabled={page === data.pagination.pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
