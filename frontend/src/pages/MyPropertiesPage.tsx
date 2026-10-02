import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Building2, Search, ShieldCheck, Clock } from 'lucide-react';
import clsx from 'clsx';
import { PropertyDetailView } from '@/components/views/PropertyDetailView';
import { CreateProperty } from '@/components/forms/CreateProperty';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { EmptyState } from '@/components/ui/EmptyState';
import { GridSkeleton } from '@/components/ui/GridSkeleton';
import { PropertyCard } from '@/components/views/cards/PropertyCard';
import { useAuth } from '@/context/AuthContext';

export default function MyPropertiesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<'list'|'grid'>((localStorage.getItem('crm_myPropsView') as 'list'|'grid') || 'grid');

  const handleViewChange = (v: 'list'|'grid') => {
    setView(v);
    localStorage.setItem('crm_myPropsView', v);
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-properties', searchQuery, approvalFilter],
    queryFn: async () => {
      const res = await api.get('/properties/my', {
        params: {
          limit: 10000,
          q: searchQuery || undefined,
        },
      });
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (propertyId: string) => api.patch(`/properties/${propertyId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-properties'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      alert('Property approved successfully!');
    },
    onError: (e: any) => alert(e?.response?.data?.message || 'Failed to approve property'),
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    try {
      await api.delete(`/properties/${id}`);
      refetch();
    } catch (err) {
      console.error('Failed to delete property:', err);
    }
  };

  // Filter by approval status if selected
  const allProperties: any[] = data?.data || [];
  const filteredProperties = allProperties.filter(p => {
    const matchesSearch = !searchQuery ||
      p.propertyTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location?.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesApproval = !approvalFilter || p.approvalStatus === approvalFilter;
    return matchesSearch && matchesApproval;
  });

  const pendingCount = allProperties.filter(p => p.approvalStatus === 'pending').length;
  const approvedCount = allProperties.filter(p => p.approvalStatus === 'approved' || !p.approvalStatus).length;

  if (isCreating || editingItem) {
    return (
      <CreateProperty
        initialData={editingItem}
        onSuccess={() => { setIsCreating(false); setEditingItem(null); refetch(); }}
        onCancel={() => { setIsCreating(false); setEditingItem(null); }}
      />
    );
  }

  if (viewingItem) {
    const currentItem = allProperties.find((item: any) => item._id === viewingItem._id) || viewingItem;
    return (
      <PropertyDetailView
        property={currentItem}
        onBack={() => setViewingItem(null)}
        onEdit={() => { setEditingItem(currentItem); setViewingItem(null); }}
      />
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Properties</h1>
          <p className="page-subtitle">
            {user?.role === 'admin' ? 'All properties in the system' : 'Properties you have submitted'}
          </p>
        </div>
        <button className="btn-accent" onClick={() => setIsCreating(true)}>
          <Building2 size={16} />
          <span className="hidden sm:inline ml-1.5">Add Property</span>
        </button>
      </div>

      {/* Summary Stats */}
      {user?.role !== 'admin' && (
        <div className="flex flex-wrap gap-3 mb-4">
          <div
            className={clsx(
              'card px-3 py-2 cursor-pointer transition-all flex items-center gap-2',
              approvalFilter === '' ? 'ring-1 ring-accent bg-accent/5' : 'hover:border-accent/40'
            )}
            onClick={() => setApprovalFilter('')}
          >
            <div className="text-lg font-bold text-primary">{allProperties.length}</div>
            <div className="text-xs font-medium text-muted">Total Submitted</div>
          </div>
          <div
            className={clsx(
              'card px-3 py-2 cursor-pointer transition-all flex items-center gap-2',
              approvalFilter === 'pending' ? 'ring-1 ring-amber-400 bg-amber-50' : 'hover:border-amber-300'
            )}
            onClick={() => setApprovalFilter(approvalFilter === 'pending' ? '' : 'pending')}
          >
            <div className="flex items-center gap-1.5">
              <div className="text-lg font-bold text-amber-600">{pendingCount}</div>
              {pendingCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <div className="text-xs font-medium text-muted">Pending Approval</div>
          </div>
        </div>
      )}

      <div className="card">
        {/* Search & Filters */}
        <div className="card-header bg-surface-alt flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-row flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-muted" />
              </div>
              <input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input pl-10 w-full"
              />
            </div>
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="form-select flex-1 min-w-[140px] sm:w-auto sm:flex-none"
            >
              <option value="">All Submissions</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
            </select>
            <span className="text-sm text-muted whitespace-nowrap">
              {filteredProperties.length} properties
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle view={view} onChange={handleViewChange} />
          </div>
        </div>

        {view === 'grid' ? (
          <div className="p-4 sm:p-6 bg-surface">
            {isLoading ? (
              <GridSkeleton count={6} />
            ) : !filteredProperties.length ? (
              <EmptyState
                title={approvalFilter === 'pending' ? 'No pending properties' : 'No properties found'}
                description={
                  approvalFilter === 'pending'
                    ? 'All your submitted properties have been reviewed.'
                    : "You haven't submitted any properties yet. Click the button above to add one."
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProperties.map((p: any) => (
                  <PropertyCard
                    key={p._id}
                    property={p}
                    onView={() => setViewingItem(p)}
                    onEdit={() => setEditingItem(p)}
                    onDelete={() => handleDelete(p._id)}
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
                  <th>Code / Title</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Price</th>
                  <th>Property Status</th>
                  <th>Approval</th>
                  <th>Created</th>
                  {user?.role === 'admin' && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="py-12 text-center text-muted">Loading...</td></tr>
                ) : !filteredProperties.length ? (
                  <tr><td colSpan={8} className="py-12 text-center text-muted">No properties found.</td></tr>
                ) : filteredProperties.map((p: any) => (
                  <tr key={p._id} className="cursor-pointer" onClick={() => setViewingItem(p)}>
                    <td>
                      <div className="font-semibold text-sm">{p.propertyTitle}</div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">{p.code}</div>
                    </td>
                    <td className="text-muted text-sm">{p.propertyType}</td>
                    <td className="text-muted text-sm">{p.location?.location || '—'}</td>
                    <td className="font-medium text-sm">
                      {p.price ? `₹${p.price.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>
                      <span className={clsx('badge text-[10px]',
                        p.propertyStatus === 'Available' ? 'badge-green' :
                        p.propertyStatus === 'In Allotment' ? 'badge-blue' :
                        p.propertyStatus === 'In Deal' ? 'badge-amber' :
                        p.propertyStatus === 'Sold' ? 'badge-red' : 'badge-gray'
                      )}>
                        {p.propertyStatus}
                      </span>
                    </td>
                    <td>
                      {p.approvalStatus === 'pending' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="badge badge-amber text-[10px] flex items-center gap-1">
                            <Clock size={10} /> Pending
                          </span>
                          {user?.role === 'admin' && (
                            <button
                              className="btn-icon hover:text-accent hover:bg-accent/10"
                              title="Approve this property"
                              onClick={(e) => { e.stopPropagation(); approveMutation.mutate(p._id); }}
                              disabled={approveMutation.isPending}
                            >
                              <ShieldCheck size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="badge badge-green text-[10px]">Approved</span>
                      )}
                    </td>
                    <td className="text-muted text-xs">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    {user?.role === 'admin' && (
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <button
                            className="btn-icon hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => setEditingItem(p)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
