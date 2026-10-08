import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Search, Eye, ChevronRight } from 'lucide-react';
import { CreateBuyer } from '@/components/forms/CreateBuyer';
import { BuyerDetailView } from '@/components/views/BuyerDetailView';
import clsx from 'clsx';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { EmptyState } from '@/components/ui/EmptyState';
import { GridSkeleton } from '@/components/ui/GridSkeleton';
import { BuyerCard } from '@/components/views/cards/BuyerCard';

export default function BuyersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<'list'|'grid'>((localStorage.getItem('crm_buyersView') as 'list'|'grid') || 'grid');

  const handleViewChange = (v: 'list'|'grid') => {
    setView(v);
    localStorage.setItem('crm_buyersView', v);
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['buyers', searchQuery],
    queryFn: async () => {
      const endpoint = searchQuery ? '/search/buyers' : '/buyers';
      const res = await api.get(endpoint, { params: { limit: 10000, q: searchQuery || undefined } });
      return res.data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this buyer?')) return false;
    try { await api.delete(`/buyers/${id}`); refetch(); return true; }
    catch { alert('Failed to delete buyer'); return false; }
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
        onDelete={async () => {
          if (await handleDelete(viewingItem._id)) setViewingItem(null);
        }}
      />
    );
  }

  return (
    <>
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Buyers</h1><p className="page-subtitle">Manage prospective property buyers</p></div>
        <button className="btn-accent" onClick={() => setIsCreating(true)}><Plus size={16} /></button>
      </div>
      <div className="card">
        {/* Search */}
        <div className="card-header bg-surface-alt flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-row flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-muted" />
              </div>
              <input
                type="text"
                placeholder="Search buyers..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); }}
                className="form-input pl-10 w-full"
              />
            </div>
            <span className="text-sm text-muted whitespace-nowrap flex-1 sm:flex-none">
              {data?.pagination?.total ?? 0} buyers
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle view={view} onChange={handleViewChange} />
          </div>
        </div>
        
        {view === 'grid' ? (
          <div className="p-4 sm:p-6 bg-surface">
            {isLoading ? (
              <GridSkeleton count={8} />
            ) : !data?.data?.length ? (
              <EmptyState title="No buyers found" description="There are no buyers matching your current search." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.data.map((b: any) => (
                  <BuyerCard 
                    key={b._id} 
                    buyer={b} 
                    onView={() => setViewingItem(b)} 
                    onEdit={() => setEditingItem(b)}
                    onDelete={() => handleDelete(b._id)} 
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Contact</th><th>Purpose</th><th>Property Type</th><th>BHK Requirement</th><th>Location</th><th>Budget Max</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={8} className="py-12 text-center text-muted">Loading...</td></tr>
                : !data?.data?.length ? <tr><td colSpan={8} className="py-12 text-center text-muted">No buyers found.</td></tr>
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
                      <td className="text-muted">{b.propertyTypeInterested || '—'}</td>
                      <td className="text-muted font-medium">{b.bhkRequirement ? `${b.bhkRequirement} BHK` : '—'}</td>
                      <td className="text-muted">{b.preferredLocation}</td>
                      <td className="font-medium">₹{b.budgetMax?.toLocaleString('en-IN') || 'N/A'}</td>

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
        )}
      </div>
    </div>
    </>
  );
}
