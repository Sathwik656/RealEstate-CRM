import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Search, Plus, Edit2, Trash2, Save, X, MapPin, Check, AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LocationEntry {
  _id: string;
  location: string;
  code: string;
  updatedAt: string;
}

// ─── Inline Edit Row ─────────────────────────────────────────────────────────

function EditRow({
  entry,
  onSave,
  onCancel,
  saving,
  error,
}: {
  entry: LocationEntry;
  onSave: (id: string, location: string, code: string) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [loc, setLoc] = useState(entry.location);
  const [code, setCode] = useState(entry.code);

  return (
    <tr className="bg-accent/5 border-b border-border">
      <td className="px-4 py-2.5">
        <input
          className="form-input text-sm py-1.5"
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          placeholder="Location name"
        />
      </td>
      <td className="px-4 py-2.5">
        <input
          className="form-input text-sm py-1.5 uppercase font-mono"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={10}
          placeholder="CODE"
        />
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex justify-end gap-1.5">
          {error && (
            <span className="text-xs text-red-500 mr-2 flex items-center gap-1">
              <AlertCircle size={11} /> {error}
            </span>
          )}
          <button
            className="btn-icon text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
            onClick={() => onSave(entry._id, loc, code)}
            disabled={saving}
            title="Save"
          >
            {saving ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Save size={14} />}
          </button>
          <button className="btn-icon hover:text-red-500 hover:bg-red-50" onClick={onCancel} title="Cancel">
            <X size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Add Row ─────────────────────────────────────────────────────────────────

function AddRow({
  onSave,
  onCancel,
  saving,
  error,
}: {
  onSave: (location: string, code: string) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [loc, setLoc] = useState('');
  const [code, setCode] = useState('');
  const locRef = useRef<HTMLInputElement>(null);

  return (
    <tr className="bg-emerald-50/60 border-b border-border">
      <td className="px-4 py-2.5">
        <input
          ref={locRef}
          autoFocus
          className="form-input text-sm py-1.5"
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          placeholder="New location name..."
        />
      </td>
      <td className="px-4 py-2.5">
        <input
          className="form-input text-sm py-1.5 uppercase font-mono"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={10}
          placeholder="CODE"
        />
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex justify-end gap-1.5 items-center">
          {error && (
            <span className="text-xs text-red-500 mr-2 flex items-center gap-1">
              <AlertCircle size={11} /> {error}
            </span>
          )}
          <button
            className="btn-icon text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
            onClick={() => onSave(loc, code)}
            disabled={saving}
            title="Save new location"
          >
            {saving ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Check size={14} />}
          </button>
          <button className="btn-icon hover:text-red-500 hover:bg-red-50" onClick={onCancel} title="Cancel">
            <X size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['locations', page, debouncedSearch],
    queryFn: async () => {
      const res = await api.get('/locations', {
        params: { page, limit: 50, q: debouncedSearch || undefined },
      });
      return res.data;
    },
  });

  const locations: LocationEntry[] = data?.data ?? [];
  const pagination = data?.pagination;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: ({ location, code }: { location: string; code: string }) =>
      api.post('/locations', { location, code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      setAddingNew(false);
      setRowError(null);
      showSuccess('Location added successfully');
    },
    onError: (err: any) => setRowError(err.response?.data?.message || 'Failed to add location'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, location, code }: { id: string; location: string; code: string }) =>
      api.put(`/locations/${id}`, { location, code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      setEditingId(null);
      setRowError(null);
      showSuccess('Location updated successfully');
    },
    onError: (err: any) => setRowError(err.response?.data?.message || 'Failed to update location'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/locations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      showSuccess('Location deleted');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to delete location'),
  });

  const handleDelete = (entry: LocationEntry) => {
    if (!window.confirm(`Delete "${entry.location} (${entry.code})"? This cannot be undone.`)) return;
    deleteMutation.mutate(entry._id);
  };

  const startEdit = (id: string) => {
    setAddingNew(false);
    setRowError(null);
    setEditingId(id);
  };

  const startAdd = () => {
    setEditingId(null);
    setRowError(null);
    setAddingNew(true);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage system configuration</p>
        </div>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm animate-slide-up">
          <Check size={14} /> {successMsg}
        </div>
      )}

      {/* Location Codes Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-accent" />
            <div>
              <h2 className="font-display font-semibold text-primary">Location Codes</h2>
              <p className="text-xs text-muted mt-0.5">
                {pagination?.total ?? 0} locations · Edit codes or add new ones
              </p>
            </div>
          </div>
          <button
            className="btn-accent btn-sm flex items-center gap-1.5"
            onClick={startAdd}
          >
            <Plus size={14} /> Add Location
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-border bg-surface-alt">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={15} />
            <input
              type="text"
              placeholder="Search location or code..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="form-input pl-9 text-sm py-2 w-full"
            />
            {search && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Location Name</th>
                <th>Code</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Add new row at top */}
              {addingNew && (
                <AddRow
                  onSave={(location, code) => createMutation.mutate({ location, code })}
                  onCancel={() => { setAddingNew(false); setRowError(null); }}
                  saving={createMutation.isPending}
                  error={addingNew ? rowError : null}
                />
              )}

              {isLoading ? (
                <tr><td colSpan={3} className="py-12 text-center text-muted">Loading locations...</td></tr>
              ) : !locations.length ? (
                <tr><td colSpan={3} className="py-12 text-center text-muted">No locations found.</td></tr>
              ) : locations.map((entry) =>
                editingId === entry._id ? (
                  <EditRow
                    key={entry._id}
                    entry={entry}
                    onSave={(id, location, code) => updateMutation.mutate({ id, location, code })}
                    onCancel={() => { setEditingId(null); setRowError(null); }}
                    saving={updateMutation.isPending}
                    error={editingId === entry._id ? rowError : null}
                  />
                ) : (
                  <tr key={entry._id} className="hover:bg-surface-alt/60">
                    <td className="font-medium">{entry.location}</td>
                    <td>
                      <span className="font-mono text-xs bg-accent/10 text-accent px-2 py-0.5 rounded font-semibold tracking-wider">
                        {entry.code}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          className="btn-icon hover:text-blue-600 hover:bg-blue-50"
                          title="Edit"
                          onClick={() => startEdit(entry._id)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                          onClick={() => handleDelete(entry)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="pagination">
            <span className="text-sm text-muted">
              Page {pagination.page} of {pagination.pages} · {pagination.total} total
            </span>
            <div className="flex gap-2">
              <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </button>
              <button
                className="pagination-btn"
                disabled={page === pagination.pages}
                onClick={() => setPage(p => p + 1)}
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
