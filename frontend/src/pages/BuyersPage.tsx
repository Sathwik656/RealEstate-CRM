import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { CreateBuyer } from '@/components/forms/CreateBuyer';

export default function BuyersPage() {
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['buyers', page],
    queryFn: async () => (await api.get('/buyers', { params: { page, limit: 10 } })).data,
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this buyer?')) return;
    try { await api.delete(`/buyers/${id}`); refetch(); }
    catch { alert('Failed to delete buyer'); }
  };

  if (isCreating || editingItem) return <CreateBuyer initialData={editingItem} onSuccess={() => { setIsCreating(false); setEditingItem(null); refetch(); }} onCancel={() => { setIsCreating(false); setEditingItem(null); }} />;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Buyers</h1><p className="page-subtitle">Manage prospective property buyers</p></div>
        <button className="btn-accent" onClick={() => setIsCreating(true)}><Plus size={16} /></button>
      </div>
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Contact</th><th>Location</th><th>Budget Max</th><th>Next Contact</th><th>Note</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="py-12 text-center text-muted">Loading...</td></tr>
                : !data?.data?.length ? <tr><td colSpan={7} className="py-12 text-center text-muted">No buyers found.</td></tr>
                  : data.data.map((b: any) => (
                    <tr key={b._id}>
                      <td className="font-semibold">{b.buyerName}</td>
                      <td className="text-muted">{b.contactNumber}</td>
                      <td className="text-muted">{b.preferredLocation}</td>
                      <td className="font-medium">₹{b.budgetMax?.toLocaleString('en-IN') || 'N/A'}</td>
                      <td className="text-muted">{b.followUpDate ? new Date(b.followUpDate).toLocaleDateString() : '—'}</td>
                      <td className="text-muted max-w-[150px] truncate" title={b.note}>{b.note || '—'}</td>
                      <td className="text-right"><div className="flex justify-end gap-1">
                        <button className="btn-icon hover:text-blue-600 hover:bg-blue-50" onClick={() => setEditingItem(b)}><Edit size={15} /></button>
                        <button className="btn-icon hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(b._id)}><Trash2 size={15} /></button>
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
