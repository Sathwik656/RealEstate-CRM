import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { CreateSeller } from '@/components/forms/CreateSeller';

export default function SellersPage() {
  const [page, setPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sellers', page],
    queryFn: async () => (await api.get('/sellers', { params: { page, limit: 10 } })).data,
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this seller?')) return;
    try { await api.delete(`/sellers/${id}`); refetch(); }
    catch { alert('Failed to delete seller'); }
  };

  if (isCreating) return <CreateSeller onSuccess={() => { setIsCreating(false); refetch(); }} onCancel={() => setIsCreating(false)} />;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Sellers</h1><p className="page-subtitle">Manage property owners and sellers</p></div>
        <button className="btn-accent" onClick={() => setIsCreating(true)}><Plus size={16} /> Add Seller</button>
      </div>
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Seller ID</th><th>Name</th><th>Contact</th><th>Address</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="py-12 text-center text-muted">Loading...</td></tr>
               : !data?.data?.length ? <tr><td colSpan={5} className="py-12 text-center text-muted">No sellers found.</td></tr>
               : data.data.map((s: any) => (
                <tr key={s._id}>
                  <td><span className="font-mono text-xs text-muted">{s.sellerId}</span></td>
                  <td className="font-semibold">{s.sellerName}</td>
                  <td className="text-muted">{s.contactNumber}</td>
                  <td className="text-muted max-w-xs truncate">{s.address}</td>
                  <td className="text-right"><div className="flex justify-end gap-1">
                    <button className="btn-icon hover:text-blue-600 hover:bg-blue-50"><Edit size={15} /></button>
                    <button className="btn-icon hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(s._id)}><Trash2 size={15} /></button>
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
