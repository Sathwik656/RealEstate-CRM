import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Search, Plus, Edit2, Trash2, Save, X, MapPin, Check, AlertCircle, Bell, Loader2, User, LogOut, ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { Capacitor } from '@capacitor/core';
import { setupCapacitorPushNotifications } from '@/lib/capacitorPushNotifications';
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
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState<'menu' | 'notifications' | 'locations' | 'profile' | 'terms'>('menu');
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

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ── Push Notification Settings ─────────────────────────────────────────────

  const { data: notifData, isLoading: isLoadingNotif } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const res = await api.get('/notifications/settings');
      return res.data.data;
    },
  });

  const [isSubscribing, setIsSubscribing] = useState(false);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleTogglePush = async () => {
    if (notifData?.notificationsEnabled) {
      // Disable
      setIsSubscribing(true);
      try {
        if (!Capacitor.isNativePlatform()) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
        }
        await api.put('/notifications/settings', { notificationsEnabled: false });
        qc.invalidateQueries({ queryKey: ['notification-settings'] });
        showSuccess('Push notifications disabled');
      } catch (err) {
        console.error('Failed to disable notifications', err);
        setRowError('Failed to disable notifications');
      } finally {
        setIsSubscribing(false);
      }
    } else {
      // Enable
      setIsSubscribing(true);
      try {
        if (Capacitor.isNativePlatform()) {
          await setupCapacitorPushNotifications();
          await api.put('/notifications/settings', { notificationsEnabled: true });
        } else {
          if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setRowError('Push notifications are not supported by this browser.');
            setIsSubscribing(false);
            return;
          }
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            setRowError('Notification permission denied by user.');
            setIsSubscribing(false);
            return;
          }

          const registration = await navigator.serviceWorker.ready;
          let subscription = await registration.pushManager.getSubscription();

          if (!subscription) {
            const publicVapidKey = notifData?.vapidPublicKey || import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (!publicVapidKey) {
              throw new Error('VAPID public key not found');
            }
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
            });
          }

          await api.post('/notifications/subscribe', subscription.toJSON());
        }
        qc.invalidateQueries({ queryKey: ['notification-settings'] });
        showSuccess('Push notifications enabled for this device');
      } catch (err) {
        console.error('Failed to enable notifications', err);
        setRowError('Failed to subscribe to push notifications');
      } finally {
        setIsSubscribing(false);
      }
    }
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
    <>
    <div className="page-wrapper">
      <div className="page-header mb-6">
        <div>
          <div className="flex items-center gap-2">
            {activeSection !== 'menu' && (
              <button 
                onClick={() => setActiveSection('menu')}
                className="btn-icon hover:bg-surface-alt bg-surface border border-border shadow-sm p-1.5 rounded-lg mr-2"
                title="Back to Settings"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h1 className="page-title">
              {activeSection === 'menu' ? 'Settings' : 
               activeSection === 'notifications' ? 'Notifications' : 
               activeSection === 'locations' ? 'Location Codes' : 
               activeSection === 'terms' ? 'Terms & Conditions' : 'Profile'}
            </h1>
          </div>
          <p className="page-subtitle mt-1">
            {activeSection === 'menu' ? 'Manage your account and system preferences' : 
             activeSection === 'notifications' ? 'Manage notification preferences' :
             activeSection === 'locations' ? 'Manage locations and location codes' :
             activeSection === 'terms' ? 'View the terms and conditions' :
             'View your account information'}
          </p>
        </div>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm animate-slide-up">
          <Check size={14} /> {successMsg}
        </div>
      )}

      {/* Main Settings Menu (List View) */}
      {activeSection === 'menu' && (
        <div className="flex flex-col gap-3 max-w-3xl">
          <button 
            onClick={() => setActiveSection('notifications')} 
            className="card text-left p-4 hover:border-accent/50 hover:shadow-sm transition-all group flex items-center justify-between bg-surface border border-border/60 rounded-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Bell size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-primary group-hover:text-accent transition-colors">Notifications</h3>
                <p className="text-xs text-muted">Manage notification preferences</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all ml-4 flex-shrink-0" />
          </button>
          
          {user?.role === 'admin' && (
            <button 
              onClick={() => setActiveSection('locations')} 
              className="card text-left p-4 hover:border-accent/50 hover:shadow-sm transition-all group flex items-center justify-between bg-surface border border-border/60 rounded-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <MapPin size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-primary group-hover:text-accent transition-colors">Location Codes</h3>
                  <p className="text-xs text-muted">Manage locations and location codes</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all ml-4 flex-shrink-0" />
            </button>
          )}

          <button 
            onClick={() => setActiveSection('profile')} 
            className="card text-left p-4 hover:border-accent/50 hover:shadow-sm transition-all group flex items-center justify-between bg-surface border border-border/60 rounded-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <User size={20} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-primary group-hover:text-accent transition-colors">Profile</h3>
                <p className="text-xs text-muted">View your account information</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all ml-4 flex-shrink-0" />
          </button>

          <button 
            onClick={() => setActiveSection('terms')} 
            className="card text-left p-4 hover:border-accent/50 hover:shadow-sm transition-all group flex items-center justify-between bg-surface border border-border/60 rounded-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-primary group-hover:text-accent transition-colors">Terms & Conditions</h3>
                <p className="text-xs text-muted">View the terms and conditions</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all ml-4 flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Push Notifications Card */}
      {activeSection === 'notifications' && (
      <div className="card">
        <div className="card-header border-b border-border">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-accent" />
            <div>
              <h2 className="font-display font-semibold text-primary">Push Notifications</h2>
              <p className="text-xs text-muted mt-0.5">Receive notifications when new properties are added</p>
            </div>
          </div>
        </div>
        <div className="card-body p-6">
          {isLoadingNotif ? (
            <div className="flex items-center gap-2 text-muted">
              <Loader2 size={16} className="animate-spin" /> Loading settings...
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-primary">Browser Push Notifications</h3>
                <p className="text-xs text-muted mt-1 max-w-md">
                  Enable this to receive alerts directly to this device when properties are created.
                  You have {notifData?.subscriptionCount || 0} active device(s) subscribed.
                </p>
                {rowError && !addingNew && !editingId && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle size={12} /> {rowError}
                  </p>
                )}
              </div>
              <button
                className={clsx(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
                  notifData?.notificationsEnabled ? "bg-accent" : "bg-surface-alt",
                  isSubscribing && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleTogglePush}
                disabled={isSubscribing}
              >
                <span className="sr-only">Toggle notifications</span>
                <span
                  aria-hidden="true"
                  className={clsx(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    notifData?.notificationsEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Location Codes Card (Admin Only) */}
      {activeSection === 'locations' && user?.role === 'admin' && (
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
      )}

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div className="card max-w-2xl">
          <div className="card-header border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User size={16} className="text-accent" />
              <div>
                <h2 className="font-display font-semibold text-primary">User Profile</h2>
                <p className="text-xs text-muted mt-0.5">Your personal account information</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50/60 text-red-600 hover:bg-red-100 hover:text-red-700 text-xs font-semibold transition-colors shadow-sm"
              title="Logout of your account"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
          <div className="card-body p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-surface-alt border border-border/50">
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-base font-semibold text-primary">{user?.name || 'N/A'}</p>
              </div>
              <div className="p-4 rounded-lg bg-surface-alt border border-border/50">
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Email Address</p>
                <p className="text-base font-semibold text-primary">{user?.email || 'N/A'}</p>
              </div>
              <div className="p-4 rounded-lg bg-surface-alt border border-border/50">
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Role</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent capitalize">
                  {user?.role || 'user'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms Section */}
      {activeSection === 'terms' && (
        <div className="card max-w-3xl">
          <div className="card-header border-b border-border flex items-center gap-2">
            <FileText size={16} className="text-accent" />
            <div>
              <h2 className="font-display font-semibold text-primary">Terms & Conditions</h2>
              <p className="text-xs text-muted mt-0.5">Please review the rules of using the CRM</p>
            </div>
          </div>
          <div className="card-body p-6">
            <div className="prose prose-slate prose-sm max-w-none text-slate-600">
              <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-0">1. Admin Access and Authority</h3>
              <p className="mb-6">The Admin has full access and authority over all transactions, records, and changes made within the system.</p>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">2. Management of Information</h3>
              <p className="mb-6">Any property details, values, or other information created or submitted by you may be reviewed, managed, or modified by the Admin when required.</p>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">3. Responsible Property Interest</h3>
              <p className="mb-6">Only mark a property as <strong>Interested</strong> if you are genuinely interested and reasonably confident that you can proceed with the deal. Avoid marking properties as Interested without a genuine intention to continue the process.</p>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">4. Responsible Use of the System</h3>
              <p className="mb-6">All actions and transactions performed by you within the system may be recorded and visible to the Admin as activity logs. Please ensure that you use the system responsibly and carefully before taking any action.</p>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">5. Accuracy and Accountability</h3>
              <p className="mb-0">By using the system, you are responsible for the actions and information you submit. Repeated or unnecessary actions may be reviewed by the Admin.</p>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Mobile UI */}
    
    </>
  );
}
