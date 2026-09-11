import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Search, Eye, Handshake, Download } from 'lucide-react';
import clsx from 'clsx';
import { CreateProperty } from '@/components/forms/CreateProperty';
import { PropertyDetailView } from '@/components/views/PropertyDetailView';
import { useAuth } from '@/context/AuthContext';

export default function PropertiesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('all');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expressingInterestId, setExpressingInterestId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['properties', page, statusFilter, searchQuery, searchMode],
    queryFn: async () => {
      const endpoint = (searchQuery && searchMode === 'all') ? '/search/properties' : '/properties';
      
      const params: any = { page, limit: 10, status: statusFilter || undefined };
      if (searchQuery) {
        if (searchMode === 'location') {
          params.locationCode = searchQuery;
        } else {
          params.q = searchQuery;
        }
      }

      const res = await api.get(endpoint, { params });
      return res.data;
    },
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

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery && searchMode === 'location') {
        params.append('locationCode', searchQuery);
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      const res = await api.get('/properties/export?' + params.toString(), { responseType: 'blob' });
      
      let filename = 'Properties_Export.xlsx';
      const disposition = res.headers['content-disposition'] as string | undefined;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const contentType = (res.headers['content-type'] as string) || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([res.data], { type: contentType });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to export properties:', err);
    }
  };

  const expressInterestMutation = useMutation({
    mutationFn: (propertyId: string) => api.post(`/allotments/${propertyId}/interest`),
    onSuccess: () => {
      setExpressingInterestId(null);
      refetch();
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      alert('Interest registered successfully! Admin will review the allotment.');
    },
    onError: (e: any) => {
      setExpressingInterestId(null);
      alert(e?.response?.data?.message || 'Failed to express interest. The property may no longer be available.');
    },
  });

  const handleExpressInterest = (propertyId: string) => {
    if (!window.confirm('Express interest in this property? It will go into Allotment for the Admin to review.')) return;
    setExpressingInterestId(propertyId);
    expressInterestMutation.mutate(propertyId);
  };

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
    return (
      <PropertyDetailView
        property={viewingItem}
        onBack={() => setViewingItem(null)}
        onEdit={() => { setEditingItem(viewingItem); setViewingItem(null); }}
      />
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-subtitle">Manage your real estate listings</p>
        </div>
        <button className="btn-accent" onClick={() => setIsCreating(true)}>
          <Plus size={16} />
        </button>
      </div>

      <div className="card">
        {/* Filters & Search */}
        <div className="card-header bg-surface-alt flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-muted" />
              </div>
              <input
                type="text"
                placeholder={searchMode === 'location' ? "Enter Location Code..." : "Search properties..."}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="form-input pl-10 w-full"
              />
            </div>
            <select
              value={searchMode}
              onChange={(e) => { setSearchMode(e.target.value); setPage(1); }}
              className="form-select w-full sm:w-44"
            >
              <option value="all">Search All</option>
              <option value="location">By Location Code</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="form-select w-full sm:w-44"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="In Deal">In Deal</option>
              <option value="Sold">Sold</option>
            </select>
            {searchMode === 'location' && searchQuery && data?.data?.length > 0 && (
              <button 
                className="btn-outline flex items-center gap-2"
                onClick={handleExport}
              >
                <Download size={16} /> Export Excel
              </button>
            )}
          </div>
          <span className="text-sm text-muted whitespace-nowrap">
            {data?.pagination?.total ?? 0} properties
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID/Title</th>
                <th>Type &amp; Purpose</th>
                <th>Price &amp; Area</th>
                <th>Location</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted">Loading properties...</td></tr>
              ) : !data?.data?.length ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted">No properties found.</td></tr>
              ) : data.data.map((p: any) => (
                <tr
                  key={p._id}
                  className="cursor-pointer"
                  onClick={() => setViewingItem(p)}
                >
                  <td>
                    <div className="font-semibold">{p.propertyTitle}</div>
                    <div className="text-[10px] text-muted font-mono mt-0.5">{p.code}</div>
                  </td>
                  <td>
                    <span className="text-muted">{p.propertyType}</span>
                    {p.purpose && <span className="ml-2 badge badge-blue text-[10px]">{p.purpose}</span>}
                  </td>
                  <td className="font-medium">
                    ₹{p.price?.toLocaleString('en-IN')}
                    {p.area && <div className="text-xs text-muted">{p.area.toLocaleString()} sqft</div>}
                  </td>
                  <td className="text-muted text-xs truncate max-w-[120px]">
                    {p.location?.location || p.location}
                    {p.mainDoorDirection && (
                      <div className="text-[10px] text-muted opacity-75 mt-0.5" title={p.mainDoorDirection}>
                        Door: {p.mainDoorDirection}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={clsx('badge',
                      p.propertyStatus === 'Available' ? 'badge-green' :
                        p.propertyStatus === 'In Allotment' ? 'badge-blue' :
                          p.propertyStatus === 'In Deal' ? 'badge-amber' :
                            p.propertyStatus === 'Sold' ? 'badge-red' : 'badge-gray'
                    )}>
                      {p.propertyStatus}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon hover:text-accent hover:bg-accent/10"
                        title="View details"
                        onClick={() => setViewingItem(p)}
                      >
                        <Eye size={15} />
                      </button>
                      {/* Express Interest — agent only, available or in-allotment properties only */}
                      {user?.role === 'agent' && (p.propertyStatus === 'Available' || p.propertyStatus === 'In Allotment') && (
                        <button
                          className={clsx("btn btn-sm", p.isApplied ? "bg-emerald-500/10 text-emerald-600 cursor-default hover:bg-emerald-500/10" : "bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50")}
                          title={p.isApplied ? "You have already applied" : "Express interest in this property"}
                          disabled={p.isApplied || expressingInterestId === p._id || expressInterestMutation.isPending}
                          onClick={() => !p.isApplied && handleExpressInterest(p._id)}
                        >
                          <Handshake size={13} />
                          {p.isApplied ? 'Applied' : 'Interested'}
                        </button>
                      )}
                      {/* Edit & Delete — admin only */}
                      {user?.role === 'admin' && (
                        <>
                          <button
                            className="btn-icon hover:text-blue-600 hover:bg-blue-50"
                            title="Edit"
                            onClick={() => setEditingItem(p)}
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            className="btn-icon hover:text-red-600 hover:bg-red-50"
                            title="Delete"
                            onClick={() => handleDelete(p._id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
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
