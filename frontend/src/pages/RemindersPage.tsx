import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Bell } from 'lucide-react';
import { CreateReminder } from '@/components/forms/CreateReminder';
import { cancelReminder } from '@/lib/notifications';

export default function RemindersPage() {
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reminders', page],
    queryFn: async () => (await api.get('/reminders', { params: { page, limit: 10 } })).data,
  });

  const handleDelete = async (id: string, notificationId: number) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await api.delete(`/reminders/${id}`);
      await cancelReminder(notificationId);
      refetch();
    } catch {
      alert('Failed to delete reminder');
    }
  };

  if (isCreating || editingItem) {
    return (
      <CreateReminder
        initialData={editingItem}
        onSuccess={() => {
          setIsCreating(false);
          setEditingItem(null);
          refetch();
        }}
        onCancel={() => {
          setIsCreating(false);
          setEditingItem(null);
        }}
      />
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Bell size={24} className="text-primary" />
            Reminders
          </h1>
          <p className="page-subtitle">Manage your local device notifications</p>
        </div>
        <button className="btn-accent flex items-center gap-2" onClick={() => setIsCreating(true)}>
          <Plus size={16} /> New Reminder
        </button>
      </div>
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Note</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">Loading...</td>
                </tr>
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">No reminders found.</td>
                </tr>
              ) : (
                data.data.map((r: any) => {
                  const isPast = new Date(r.reminderDateTime) < new Date();
                  return (
                    <tr key={r._id} className={isPast ? 'opacity-60' : ''}>
                      <td className="font-semibold">{r.title}</td>
                      <td className="text-muted truncate max-w-xs">{r.note || '—'}</td>
                      <td className="text-muted">{new Date(r.reminderDate).toLocaleDateString()}</td>
                      <td className="text-muted">{r.reminderTime}</td>
                      <td>
                        {isPast ? (
                          <span className="badge-gray">Expired</span>
                        ) : (
                          <span className="badge-green">Scheduled</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            className="btn-icon hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => setEditingItem(r)}
                            disabled={isPast}
                            title={isPast ? "Cannot edit past reminders" : "Edit"}
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            className="btn-icon hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(r._id, r.notificationId)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {data?.pagination?.pages > 1 && (
          <div className="pagination">
            <span className="text-sm text-muted">
              Page {data.pagination.page} of {data.pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                className="pagination-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="pagination-btn"
                disabled={page === data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
