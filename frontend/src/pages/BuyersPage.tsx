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
    <>
    <div className="hidden lg:block page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Buyers</h1><p className="page-subtitle">Manage prospective property buyers</p></div>
        <button className="btn-accent" onClick={() => setIsCreating(true)}><Plus size={16} /></button>
      </div>
      <div className="card">
        {/* Search */}
        <div className="card-header bg-surface-alt flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
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
            <span className="text-sm text-muted whitespace-nowrap">
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
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </div>
    
    {/* Mobile UI */}
    <div className="block lg:hidden w-full pb-6 font-sans">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-4">Buyers</h1>
        
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search buyers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 text-sm text-slate-900 rounded-full border border-transparent focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50 transition-all"
          />
        </div>
      </div>

      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-10 text-sm text-slate-500">Loading...</div>
        ) : !data?.data?.length ? (
          <div className="text-center py-10 text-sm text-slate-500">No buyers found.</div>
        ) : (
          data.data.map((b: any) => {
            const statusColor = b.status === 'Active' ? 'bg-[#E7F7ED] text-[#137A3B]' : 
                                b.status === 'Closed' ? 'bg-slate-100 text-slate-600' : 
                                'bg-[#FEF3C7] text-[#B45309]';
            return (
              <div 
                key={b._id} 
                onClick={() => setViewingItem(b)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 font-bold text-lg">
                  {b.buyerName?.charAt(0).toUpperCase() || 'B'}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{b.buyerName}</h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{b.contactNumber}</p>
                  <div className="mt-1.5 flex gap-2 items-center">
                    <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold tracking-wide', statusColor)}>
                      {b.status}
                    </span>
                    {b.budget && (
                      <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                        Budget: ₹{b.budget.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute right-4 text-slate-300">
                  <ChevronRight size={18} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
    </>
  );
}
