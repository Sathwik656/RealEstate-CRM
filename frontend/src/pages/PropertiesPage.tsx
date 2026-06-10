import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { CreateProperty } from '@/components/forms/CreateProperty';

export default function PropertiesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['properties', page, statusFilter],
    queryFn: async () => {
      const res = await api.get('/properties', {
        params: { page, limit: 10, status: statusFilter || undefined },
      });
      return res.data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this property?')) return;
    try {
      await api.delete(`/properties/${id}`);
      refetch();
    } catch {
      alert('Failed to delete property');
    }
  };

  if (isCreating) {
    return (
      <CreateProperty
        onSuccess={() => { setIsCreating(false); refetch(); }}
        onCancel={() => setIsCreating(false)}
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
          <Plus size={16} /> Add Property
        </button>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="card-header bg-surface-alt">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="form-select w-44"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Sold">Sold</option>
            <option value="Rented">Rented</option>
            <option value="Leased">Leased</option>
          </select>
          <span className="text-sm text-muted">
            {data?.pagination?.total ?? 0} properties
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Property ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Price</th>
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
                <tr key={p._id}>
                  <td><span className="font-mono text-xs text-muted">{p.propertyId}</span></td>
                  <td className="font-semibold">{p.propertyTitle}</td>
                  <td className="text-muted">{p.propertyType}</td>
                  <td className="font-medium">₹{p.price?.toLocaleString('en-IN')}</td>
                  <td>
                    <span className={
                      p.propertyStatus === 'Available' ? 'badge-green' :
                      p.propertyStatus === 'Sold' ? 'badge-red' :
                      p.propertyStatus === 'Rented' ? 'badge-blue' : 'badge-gray'
                    }>
                      {p.propertyStatus}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button className="btn-icon hover:text-blue-600 hover:bg-blue-50"><Edit size={15} /></button>
                      <button className="btn-icon hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(p._id)}><Trash2 size={15} /></button>
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
