import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  ShieldCheck, Building2, User, MapPin, Tag, IndianRupee,
  Search, Eye, CheckCircle, Clock, Square, Maximize2,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n?: number) {
  if (!n) return '—';
  return '₹' + n.toLocaleString('en-IN');
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2.5 border-b border-border last:border-0">
      <dt className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className={clsx('text-sm', value ? 'text-primary font-medium' : 'text-muted italic')}>
        {value || 'Not set'}
      </dd>
    </div>
  );
}

function InfoSection({ title, icon: Icon, children, highlight = false }: {
  title: string; icon: any; children: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={clsx(
      'rounded-xl border overflow-hidden',
      highlight ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface'
    )}>
      <div className={clsx(
        'px-4 py-3 border-b flex items-center gap-2',
        highlight ? 'border-accent/30 bg-accent/10' : 'border-border bg-surface-alt'
      )}>
        <Icon size={14} className={clsx('flex-shrink-0', highlight ? 'text-accent' : 'text-muted')} />
        <h4 className={clsx('text-xs font-bold uppercase tracking-wider', highlight ? 'text-accent' : 'text-muted')}>
          {title}
        </h4>
      </div>
      <dl className="px-4">{children}</dl>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({ property: p, onClose, onApproved }: {
  property: any;
  onClose: () => void;
  onApproved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const location = typeof p?.location === 'object'
    ? `${p.location?.location || ''}${p.location?.code ? ` (${p.location.code})` : ''}`
    : p?.location;

  const submittedBy = p?.createdByUserId || p?.referredByAgentId;

  const handleApprove = async () => {
    setError('');
    setLoading(true);
    try {
      await api.patch(`/properties/${p._id}/approve`);
      onApproved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to approve property.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="px-6 py-5 rounded-t-2xl"
          style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #252b3b 100%)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-amber text-[10px] animate-pulse">⏳ Pending Approval</span>
            <span className="font-mono text-white/40 text-xs">{p.code}</span>
          </div>
          <h2 className="text-white font-display font-bold text-xl leading-tight">{p.propertyTitle}</h2>
          <p className="text-white/50 text-xs mt-1">Review the property details before approving</p>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Property Details */}
          <InfoSection title="Property Details" icon={Building2}>
            <InfoRow label="Property Title" value={p.propertyTitle} />
            <InfoRow label="Property Code" value={p.code} />
            <InfoRow label="Type" value={p.propertyType} />
            <InfoRow label="Purpose" value={p.purpose} />
            <InfoRow label="Price" value={fmt(p.price)} />
            <InfoRow label="Area" value={p.area ? `${p.area.toLocaleString()} sq ft` : null} />
            {p.bhk && <InfoRow label="BHK" value={String(p.bhk)} />}
            <InfoRow label="Description" value={p.propertyDescription} />
          </InfoSection>

          {/* Location */}
          <InfoSection title="Location" icon={MapPin}>
            <InfoRow label="Location" value={location} />
            <InfoRow label="Address" value={p.address} />
            <InfoRow label="Landmark" value={p.landmark} />
          </InfoSection>

          {/* Two-column: Seller + Submitting Agent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {p.sellerId && (
              <InfoSection title="Linked Seller" icon={User}>
                <InfoRow label="Name" value={p.sellerId?.sellerName} />
                <InfoRow label="Contact" value={p.sellerId?.contactNumber} />
              </InfoSection>
            )}
            <InfoSection title="Submitted By (Agent)" icon={User} highlight>
              <InfoRow label="Name" value={submittedBy?.name} />
              <InfoRow label="Agent Code" value={submittedBy?.code} />
              <InfoRow label="Submitted" value={fmtDate(p.createdAt)} />
            </InfoSection>
          </div>

          {/* Warning */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-800">
                <span className="font-semibold">Approving this property</span> will make it immediately
                visible to all agents in the property listings and they can express interest in it.
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-accent flex items-center gap-2"
            onClick={handleApprove}
            disabled={loading}
          >
            <ShieldCheck size={15} />
            {loading ? 'Approving...' : 'Approve Property'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PropertyApprovalsPage() {
  const qc = useQueryClient();
  const [reviewingProperty, setReviewingProperty] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['properties-pending'],
    queryFn: async () => {
      // Fetch properties with pending approvalStatus
      const res = await api.get('/properties', {
        params: {
          limit: 500,
          approvalStatus: 'pending',
        },
      });
      // Filter client-side for pending (in case query param not processed)
      const all = res.data?.data || [];
      return {
        ...res.data,
        data: all.filter((p: any) => p.approvalStatus === 'pending'),
      };
    },
  });

  const handleApproved = () => {
    qc.invalidateQueries({ queryKey: ['properties-pending'] });
    qc.invalidateQueries({ queryKey: ['properties'] });
    qc.invalidateQueries({ queryKey: ['my-properties'] });
    qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    alert('Property approved! It is now live and visible to all agents.');
  };

  const properties: any[] = data?.data || [];

  const filtered = properties.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.propertyTitle?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.location?.location?.toLowerCase().includes(q) ||
      p.createdByUserId?.name?.toLowerCase().includes(q) ||
      p.referredByAgentId?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {reviewingProperty && (
        <ReviewModal
          property={reviewingProperty}
          onClose={() => setReviewingProperty(null)}
          onApproved={handleApproved}
        />
      )}

      <div className="page-wrapper">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Property Approvals</h1>
            <p className="page-subtitle">Review and approve properties submitted by agents</p>
          </div>
          {properties.length > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Clock size={13} />
              {properties.length} pending
            </span>
          )}
        </div>

        {/* Stats Banner */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{properties.length}</div>
                <div className="text-xs text-muted">Awaiting Approval</div>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3 col-span-1 sm:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={18} className="text-accent" />
              </div>
              <div>
                <div className="text-sm font-semibold text-primary">Quick Review</div>
                <div className="text-xs text-muted">Click "Review & Approve" on any row to inspect the full property details and approve it with one click.</div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          {/* Search */}
          <div className="card-header bg-surface-alt flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={15} className="text-muted" />
              </div>
              <input
                type="text"
                placeholder="Search by title, code, agent, location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input pl-9 w-full text-sm"
              />
            </div>
            <span className="text-sm text-muted whitespace-nowrap">
              {filtered.length} propert{filtered.length === 1 ? 'y' : 'ies'} pending
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type &amp; Purpose</th>
                  <th>Location</th>
                  <th>Price</th>
                  <th>Submitted By</th>
                  <th>Submitted On</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">Loading pending properties...</td>
                  </tr>
                ) : !filtered.length ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                          <CheckCircle size={32} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-primary">All caught up!</p>
                          <p className="text-muted text-sm mt-0.5">No properties are waiting for approval.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((p: any) => {
                  const submittedBy = p.createdByUserId || p.referredByAgentId;
                  const locationDisplay = typeof p.location === 'object'
                    ? `${p.location?.location || ''}${p.location?.code ? ` (${p.location.code})` : ''}`
                    : p.location || '—';

                  return (
                    <tr
                      key={p._id}
                      className="hover:bg-surface-alt transition-colors cursor-pointer"
                      onClick={() => setReviewingProperty(p)}
                    >
                      {/* Property */}
                      <td>
                        <div className="font-semibold text-sm">{p.propertyTitle}</div>
                        <div className="text-[10px] text-muted font-mono mt-0.5">{p.code}</div>
                      </td>

                      {/* Type & Purpose */}
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <span className="badge badge-amber text-[10px]">{p.propertyType}</span>
                          {p.purpose && <span className="badge badge-blue text-[10px]">{p.purpose}</span>}
                        </div>
                        {p.area && (
                          <div className="text-[10px] text-muted mt-1 flex items-center gap-1">
                            <Maximize2 size={9} /> {p.area.toLocaleString()} sqft
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td>
                        <div className="flex items-center gap-1.5 text-sm text-muted">
                          <MapPin size={12} className="flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{locationDisplay}</span>
                        </div>
                      </td>

                      {/* Price */}
                      <td>
                        <div className="flex items-center gap-1 font-semibold text-sm">
                          <IndianRupee size={12} className="text-muted" />
                          {p.price ? p.price.toLocaleString('en-IN') : '—'}
                        </div>
                      </td>

                      {/* Submitted By */}
                      <td>
                        {submittedBy ? (
                          <div className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/30 rounded-lg px-2.5 py-1.5">
                            <User size={11} className="text-accent flex-shrink-0" />
                            <div>
                              <div className="text-xs font-bold text-accent">{submittedBy.name}</div>
                              <div className="text-[10px] text-muted">{submittedBy.code || ''}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted text-sm italic">Unknown</span>
                        )}
                      </td>

                      {/* Submitted On */}
                      <td className="text-sm text-muted">
                        {new Date(p.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>

                      {/* Actions */}
                      <td className="text-right" onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-sm btn-accent flex items-center gap-1.5 ml-auto"
                          onClick={() => setReviewingProperty(p)}
                        >
                          <ShieldCheck size={13} />
                          Review &amp; Approve
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
