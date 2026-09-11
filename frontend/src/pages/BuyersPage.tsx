import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { CreateBuyer } from '@/components/forms/CreateBuyer';
import { BuyerDetailView } from '@/components/views/BuyerDetailView';
import clsx from 'clsx';

export default function BuyersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['buyers', page, searchQuery],
    queryFn: async () => {
      const endpoint = searchQuery ? '/search/buyers' : '/buyers';
      const res = await api.get(endpoint, { params: { page, limit: 10, q: searchQuery || undefined } });
      return res.data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this buyer?')) return;
    try { await api.delete(`/buyers/${id}`); refetch(); }
    catch { alert('Failed to delete buyer'); }
  };

  if (isCreating || editingItem) {
    return (
      <CreateBuyer
        initialData={editingItem}
        onSuccess={() => { setIsCreating(false); setEditingItem(null); refetch(); }}
        onCancel={() => { setIsCreating(false); setEditingItem(null); }}
      />
    );
  }

  if (viewingItem) {
    return (
      <BuyerDetailView
        buyer={viewingItem}
        onBack={() => setViewingItem(null)}
        onEdit={() => { setEditingItem(viewingItem); setViewingItem(null); }}
      />
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Buyers</h1><p className="page-subtitle">Manage prospective property buyers</p></div>
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
              placeholder="Search buyers..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="form-input pl-10 w-full"
            />
          </div>
          <span className="text-sm text-muted whitespace-nowrap">
            {data?.pagination?.total ?? 0} buyers
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Contact</th><th>Purpose</th><th>BHK Requirement</th><th>Location</th><th>Budget Max</th><th>Referred By</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={9} className="py-12 text-center text-muted">Loading...</td></tr>
                : !data?.data?.length ? <tr><td colSpan={9} className="py-12 text-center text-muted">No buyers found.</td></tr>
                  : data.data.map((b: any) => (
                    <tr key={b._id} className="cursor-pointer" onClick={() => setViewingItem(b)}>
                      <td>
                        <div className="font-semibold">{b.buyerName}</div>
                        <div className="text-[10px] text-muted font-mono mt-0.5">{b.code}</div>
                      </td>
                      <td className="text-muted">{b.contactNumber}</td>
                      <td>
                        {b.purpose
                          ? <span className={clsx('badge text-[10px]', b.purpose === 'Purchase' ? 'badge-blue' : 'badge-amber')}>{b.purpose}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-muted font-medium">{b.bhkRequirement ? `${b.bhkRequirement} BHK` : '—'}</td>
                      <td className="text-muted">{b.preferredLocation}</td>
                      <td className="font-medium">₹{b.budgetMax?.toLocaleString('en-IN') || 'N/A'}</td>
                      <td><span className="text-sm text-muted">{b.referredByAgentId?.name || ''}</span></td>
                      <td>
                        <span className={clsx('badge',
                          b.status === 'Active' ? 'badge-green' :
                          b.status === 'Closed' ? 'badge-red' :
                          b.status === 'Follow-up' ? 'badge-amber' : 'badge-gray'
                        )}>{b.status || 'Active'}</span>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button className="btn-icon hover:text-accent hover:bg-accent/10" title="View details" onClick={() => setViewingItem(b)}><Eye size={15} /></button>
                          <button className="btn-icon hover:text-blue-600 hover:bg-blue-50" title="Edit" onClick={() => setEditingItem(b)}><Edit size={15} /></button>
                          <button className="btn-icon hover:text-red-600 hover:bg-red-50" title="Delete" onClick={() => handleDelete(b._id)}><Trash2 size={15} /></button>
                        </div>
                      </td>
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
