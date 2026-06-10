import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { CreateRental } from '@/components/forms/CreateRental';

export default function RentalsPage() {
  const [page, setPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['rentals', page],
    queryFn: async () => (await api.get('/rentals', { params: { page, limit: 10 } })).data,
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this rental?')) return;
    try { await api.delete(`/rentals/${id}`); refetch(); }
    catch { alert('Failed to delete rental'); }
  };

  if (isCreating) return <CreateRental onSuccess={() => { setIsCreating(false); refetch(); }} onCancel={() => setIsCreating(false)} />;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Rental Properties</h1><p className="page-subtitle">Manage rental listings and occupancy</p></div>
        <button className="btn-accent" onClick={() => setIsCreating(true)}><Plus size={16} /> Add Rental</button>
      </div>
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Rental ID</th><th>Location</th><th>Rent</th><th>Deposit</th><th>BHK</th><th>Furnishing</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={8} className="py-12 text-center text-muted">Loading...</td></tr>
               : !data?.data?.length ? <tr><td colSpan={8} className="py-12 text-center text-muted">No rentals found.</td></tr>
               : data.data.map((r: any) => (
                <tr key={r._id}>
                  <td><span className="font-mono text-xs text-muted">{r.rentalId}</span></td>
                  <td className="font-semibold">{r.location}</td>
                  <td className="font-medium">₹{r.rentAmount?.toLocaleString('en-IN')}</td>
                  <td className="text-muted">₹{r.securityDeposit?.toLocaleString('en-IN')}</td>
                  <td className="text-muted">{r.bhk}</td>
                  <td className="text-muted">{r.furnishing}</td>
                  <td><span className={r.propertyStatus === 'Available' ? 'badge-green' : 'badge-red'}>{r.propertyStatus}</span></td>
                  <td className="text-right"><div className="flex justify-end gap-1">
                    <button className="btn-icon hover:text-blue-600 hover:bg-blue-50"><Edit size={15} /></button>
                    <button className="btn-icon hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(r._id)}><Trash2 size={15} /></button>
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
