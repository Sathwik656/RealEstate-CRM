import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Download, Search } from 'lucide-react';
import { CreateLease } from '@/components/forms/CreateLease';

export default function LeasesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leases', page, searchQuery],
    queryFn: async () => (await api.get('/leases', { params: { page, limit: 10, q: searchQuery || undefined } })).data,
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this lease?')) return;
    try { await api.delete(`/leases/${id}`); refetch(); }
    catch { alert('Failed to delete lease'); }
  };

  if (isCreating || editingItem) return <CreateLease initialData={editingItem} onSuccess={() => { setIsCreating(false); setEditingItem(null); refetch(); }} onCancel={() => { setIsCreating(false); setEditingItem(null); }} />;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Lease Agreements</h1><p className="page-subtitle">Manage rental lease contracts</p></div>
        <button className="btn-accent" onClick={() => setIsCreating(true)}><Plus size={16} /></button>
      </div>
      <div className="card">
        {/* Search */}
        <div className="card-header bg-surface-alt flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-muted" />
            </div>
            <input
              type="text"
              placeholder="Search leases (Landlord)..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="form-input pl-10 w-full"
            />
          </div>
          <span className="text-sm text-muted whitespace-nowrap">
            {data?.pagination?.total ?? 0} leases
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Landlord</th><th>Amount</th><th>Start Date</th><th>End Date</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="py-12 text-center text-muted">Loading...</td></tr>
                : !data?.data?.length ? <tr><td colSpan={6} className="py-12 text-center text-muted">No leases found.</td></tr>
                  : data.data.map((l: any) => (
                    <tr key={l._id}>
                      <td className="font-semibold">{l.landlordName}</td>
                      <td className="font-medium">₹{l.leaseAmount?.toLocaleString('en-IN')}</td>
                      <td className="text-muted">{new Date(l.leaseStartDate).toLocaleDateString()}</td>
                      <td className="text-muted">{new Date(l.leaseEndDate).toLocaleDateString()}</td>
                      <td><span className={l.status === 'Active' ? 'badge-green' : l.status === 'Expired' ? 'badge-red' : 'badge-gray'}>{l.status}</span></td>
                      <td className="text-right"><div className="flex justify-end gap-1">
                        {l.documentUrl && (
                          <a href={`http://localhost:5000${l.documentUrl}`} target="_blank" rel="noreferrer" className="btn-icon hover:text-accent hover:bg-amber-50"><Download size={15} /></a>
                        )}
                        <button className="btn-icon hover:text-blue-600 hover:bg-blue-50" onClick={() => setEditingItem(l)}><Edit size={15} /></button>
                        <button className="btn-icon hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(l._id)}><Trash2 size={15} /></button>
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
