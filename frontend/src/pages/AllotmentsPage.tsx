import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  ClipboardCheck, Handshake, Users, Building2, MapPin, User,
  ArrowRight, Search, ChevronRight, ArrowLeft, RefreshCw,
  AlertTriangle, Clock, CheckCircle, X
} from 'lucide-react';
import clsx from 'clsx';

// ─── Shared sub-components ───────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2.5 border-b border-border last:border-0">
      <dt className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className={clsx('text-sm', value ? 'text-primary font-medium' : 'text-muted italic')}>{value || 'Not set'}</dd>
    </div>
  );
}

function Section({ title, icon: Icon, children, accent = false }: { title: string; icon: any; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={clsx('rounded-lg border overflow-hidden', accent ? 'border-accent bg-accent/5' : 'border-border bg-surface')}>
      <div className={clsx('px-4 py-3 border-b flex items-center gap-2', accent ? 'border-accent/40 bg-accent/10' : 'border-border bg-surface-alt')}>
        <Icon size={14} className={clsx('flex-shrink-0', accent ? 'text-accent' : 'text-muted')} />
        <h4 className={clsx('text-xs font-bold uppercase tracking-wider', accent ? 'text-accent' : 'text-muted')}>{title}</h4>
      </div>
      <dl className="px-4">{children}</dl>
    </div>
  );
}

function InterestStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    interested: 'bg-blue-100 text-blue-700',
    waiting:    'bg-amber-100 text-amber-700',
    selected:   'bg-emerald-100 text-emerald-700',
    returned:   'bg-slate-100 text-slate-500',
  };
  return (
    <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide', map[status] ?? 'bg-slate-100 text-slate-500')}>
      {status}
    </span>
  );
}

function fmtDate(d: string | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Initial Allotment Modal ──────────────────────────────────────────────────

export function AllotModal({ allotment, onClose, onAllotted }: { allotment: any; onClose: () => void; onAllotted: () => void }) {
  const qc = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const p = allotment.property;
  const interests = allotment.interests;
  const seller = p?.sellerId;
  const location = typeof p?.location === 'object' ? `${p.location?.location}${p.location?.code ? ` (${p.location.code})` : ''}` : p?.location;

  const allotMutation = useMutation({
    mutationFn: (agentId: string) => api.post(`/allotments/${p._id}/allot`, { agentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allotments'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      alert('Property allotted successfully! It has been moved to the agent\'s deals.');
      onAllotted();
      onClose();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to allot property.');
    }
  });

  const handleAllot = () => {
    if (!selectedAgentId) return;
    if (!window.confirm('Are you sure you want to allot this property to the selected agent? This will create a Deal.')) return;
    allotMutation.mutate(selectedAgentId);
  };

  return (
    <>
    {/* Desktop */}
    <div className="hidden lg:flex fixed inset-0 bg-black/60 items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-4xl my-auto flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 rounded-t-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #252b3b 100%)' }}>
          <p className="text-white/50 text-xs font-mono mb-1">{p.code}</p>
          <h2 className="text-white font-display font-bold text-xl">Allot Property</h2>
          <p className="text-white/50 text-xs mt-1">Select an interested agent to assign this property to</p>
        </div>

        <div className="p-5 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <Section title="Property Details" icon={Building2}>
              <InfoRow label="Title" value={p.propertyTitle} />
              <InfoRow label="Type" value={p.propertyType} />
              <InfoRow label="Original Price" value={p.price ? `₹${p.price.toLocaleString('en-IN')}` : null} />
              <InfoRow label="Location" value={location} />
            </Section>
            <Section title="Owner (Seller)" icon={User}>
              {seller ? (
                <>
                  <InfoRow label="Name" value={seller.sellerName} />
                  <InfoRow label="Contact" value={seller.contactNumber} />
                </>
              ) : <InfoRow label="Seller" value={null} />}
            </Section>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-accent" />
              <h3 className="font-bold uppercase tracking-wider text-sm">Interested Agents</h3>
            </div>
            <div className="flex-1 bg-surface-alt border border-border rounded-lg p-3 space-y-2 overflow-y-auto min-h-[250px]">
              {interests.length === 0 ? (
                <p className="text-muted text-sm text-center py-8">No agents have expressed interest yet.</p>
              ) : interests.map((interest: any) => {
                const agent = interest.agent;
                const isSelected = selectedAgentId === agent._id;
                return (
                  <div key={interest._id} onClick={() => setSelectedAgentId(agent._id)}
                    className={clsx('p-3 border rounded-lg cursor-pointer transition-colors', isSelected ? 'border-accent bg-accent/10 shadow-sm' : 'border-border bg-surface hover:border-accent/40')}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-sm text-primary">{agent.name}</div>
                        <div className="text-xs text-muted font-mono mt-0.5">{agent.code}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <InterestStatusBadge status={interest.status} />
                        <div className="text-[10px] text-muted whitespace-nowrap">
                          {new Date(interest.expressedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted">
                      {/* <div>{agent.email}</div> */}
                      {agent.phone && <div>{agent.phone}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-3 flex-shrink-0">
          <button className="btn btn-outline" onClick={onClose} disabled={allotMutation.isPending}>Cancel</button>
          <button className="btn btn-accent" onClick={handleAllot} disabled={allotMutation.isPending || !selectedAgentId}>
            {allotMutation.isPending ? 'Allotting...' : 'Allot Property'}
            <ArrowRight size={16} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Unassignment Request Handling Modal ─────────────────────────────────────

export function UnassignRequestModal({
  item,
  onClose,
  onHandled,
}: {
  item: any;   // { property, currentDeal, interests }
  onClose: () => void;
  onHandled: () => void;
}) {
  const [action, setAction] = useState<'keep' | 'unassign' | 'reassign' | ''>('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const deal = item.currentDeal;
  const property = item.property;
  const waitingInterests = item.interests; // status: waiting or interested

  const location = typeof property?.location === 'object'
    ? `${property.location?.location}${property.location?.code ? ` (${property.location.code})` : ''}`
    : property?.location;

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (action === 'keep') {
        await api.patch(`/reassignments/${deal._id}/handle`, { action: 'keep' });
        alert('Assignment kept. Deal is ongoing again.');
      } else if (action === 'unassign') {
        await api.patch(`/reassignments/${deal._id}/handle`, { action: 'unassign', reason });
        alert('Agent unassigned. Property moved back to In Allotment.');
      } else if (action === 'reassign') {
        if (!selectedAgentId) { setError('Please select an agent to reassign to.'); setLoading(false); return; }
        await api.patch(`/reassignments/${deal._id}/reassign`, { newAgentId: selectedAgentId, reason });
        alert('Deal reassigned successfully!');
      }
      qc.invalidateQueries({ queryKey: ['allotments'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onHandled();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {/* Mobile */}
    

    {/* Desktop */}
    <div className="hidden lg:flex fixed inset-0 bg-black/60 items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-3xl my-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 rounded-t-xl" style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)' }}>
          <p className="text-white/50 text-xs font-mono mb-1">{deal?.dealId}</p>
          <h2 className="text-white font-display font-bold text-xl">Handle Unassignment Request</h2>
          <p className="text-white/50 text-xs mt-1">Choose how to handle this agent's unassignment request</p>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Top info */}
          <div className="grid grid-cols-2 gap-4">
            <Section title="Property" icon={Building2}>
              <InfoRow label="Title" value={property?.propertyTitle} />
              <InfoRow label="Code" value={property?.code} />
              <InfoRow label="Location" value={location} />
            </Section>
            <div className="rounded-lg border border-amber-300 bg-amber-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-200 bg-amber-100 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">Unassignment Request</h4>
              </div>
              <dl className="px-4">
                <InfoRow label="Agent" value={deal?.currentAgent?.name} />
                <InfoRow label="Code" value={deal?.currentAgent?.code} />
                <InfoRow label="Requested On" value={deal?.unassignRequestedAt ? fmtDate(deal.unassignRequestedAt) : '—'} />
                <InfoRow label="Reason" value={deal?.unassignReason || 'No reason provided'} />
              </dl>
            </div>
          </div>

          {/* Action buttons */}
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Choose Action</p>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => setAction('keep')}
                className={clsx('p-4 border rounded-lg text-left transition-all hover:shadow-sm', action === 'keep' ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-border bg-surface hover:border-emerald-300')}>
                <CheckCircle size={20} className={clsx('mb-2', action === 'keep' ? 'text-emerald-600' : 'text-muted')} />
                <p className="text-sm font-bold text-primary">Keep Assigned</p>
                <p className="text-xs text-muted mt-0.5">Revert to ongoing</p>
              </button>
              <button onClick={() => setAction('reassign')}
                className={clsx('p-4 border rounded-lg text-left transition-all hover:shadow-sm', action === 'reassign' ? 'border-accent bg-accent/5 shadow-sm' : 'border-border bg-surface hover:border-accent/40')}>
                <RefreshCw size={20} className={clsx('mb-2', action === 'reassign' ? 'text-accent' : 'text-muted')} />
                <p className="text-sm font-bold text-primary">Reassign</p>
                <p className="text-xs text-muted mt-0.5">Pick another agent</p>
              </button>
              <button onClick={() => setAction('unassign')}
                className={clsx('p-4 border rounded-lg text-left transition-all hover:shadow-sm', action === 'unassign' ? 'border-red-400 bg-red-50 shadow-sm' : 'border-border bg-surface hover:border-red-300')}>
                <X size={20} className={clsx('mb-2', action === 'unassign' ? 'text-red-600' : 'text-muted')} />
                <p className="text-sm font-bold text-primary">Unassign</p>
                <p className="text-xs text-muted mt-0.5">No replacement</p>
              </button>
            </div>
          </div>

          {/* Reassign agent picker */}
          {action === 'reassign' && (
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Select New Agent</p>
              <div className="bg-surface-alt border border-border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {waitingInterests.length === 0 ? (
                  <p className="text-muted text-sm text-center py-4">No waiting/interested agents available for reassignment.</p>
                ) : waitingInterests.map((interest: any) => (
                  <div key={interest._id} onClick={() => setSelectedAgentId(interest.agent._id)}
                    className={clsx('p-3 border rounded-lg cursor-pointer transition-colors flex items-center justify-between', selectedAgentId === interest.agent._id ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-accent/40')}>
                    <div>
                      <p className="text-sm font-bold text-primary">{interest.agent.name}</p>
                      <p className="text-xs text-muted font-mono">{interest.agent.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <InterestStatusBadge status={interest.status} />
                      <span className="text-[10px] text-muted">{fmtDate(interest.expressedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reason */}
          {(action === 'unassign' || action === 'reassign') && (
            <div className="form-group">
              <label className="form-label">Admin Note (optional)</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Add a note about this decision..."
                className="form-input resize-none"
                rows={2}
              />
            </div>
          )}

          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          {action && (
            <button
              className={clsx('btn', action === 'keep' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : action === 'reassign' ? 'btn-accent' : 'bg-red-500 text-white hover:bg-red-600', 'disabled:opacity-50')}
              onClick={handleSubmit}
              disabled={loading || (action === 'reassign' && !selectedAgentId)}
            >
              {loading ? 'Processing...' :
                action === 'keep' ? 'Keep Assigned' :
                action === 'reassign' ? 'Confirm Reassignment' :
                'Confirm Unassignment'}
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Main AllotmentsPage ──────────────────────────────────────────────────────

export default function AllotmentsPage() {
  const [viewingAllotment, setViewingAllotment] = useState<any>(null);
  const [handlingUnassign, setHandlingUnassign] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTab, setMobileTab] = useState<'initial' | 'unassign'>('initial');

  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['allotments'],
    queryFn: async () => {
      const res = await api.get('/allotments');
      return res.data;
    },
  });

  const initialAllotments: any[] = data?.data?.initialAllotments ?? [];
  const unassignmentRequests: any[] = data?.data?.unassignmentRequests ?? [];

  const filteredInitial = initialAllotments.filter((a: any) =>
    !searchQuery ||
    a.property?.propertyTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.property?.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUnassign = unassignmentRequests.filter((a: any) =>
    !searchQuery ||
    a.property?.propertyTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.currentDeal?.dealId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
    {viewingAllotment && (
      <AllotModal
        allotment={viewingAllotment}
        onClose={() => setViewingAllotment(null)}
        onAllotted={() => { setViewingAllotment(null); qc.invalidateQueries({ queryKey: ['allotments'] }); }}
      />
    )}
    {handlingUnassign && (
      <UnassignRequestModal
        item={handlingUnassign}
        onClose={() => setHandlingUnassign(null)}
        onHandled={() => { setHandlingUnassign(null); qc.invalidateQueries({ queryKey: ['allotments'] }); }}
      />
    )}

    {/* ── Desktop ── */}
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Allotment Requests</h1>
          <p className="page-subtitle">Manage property assignments and handle unassignment requests</p>
        </div>
        {unassignmentRequests.length > 0 && (
          <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <AlertTriangle size={13} />
            {unassignmentRequests.length} Unassignment Request{unassignmentRequests.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Category 1: Initial Allotments */}
      <div className="card mb-6">
        <div className="card-header bg-surface-alt">
          <div className="flex items-center gap-2">
            <Handshake size={16} className="text-accent" />
            <span className="font-bold text-sm">Pending Initial Allotment</span>
            <span className="text-xs text-muted ml-1">({initialAllotments.length})</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Location</th>
                <th>Referred By</th>
                <th>Interested Agents</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted">Loading allotments...</td></tr>
              ) : initialAllotments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Users size={36} className="text-muted mx-auto mb-3 opacity-40" />
                    <p className="text-muted text-sm">No properties currently in allotment.</p>
                  </td>
                </tr>
              ) : initialAllotments.map((allotment: any) => {
                const p = allotment.property;
                const interests = allotment.interests;
                const location = typeof p?.location === 'object' ? p.location?.location : p?.location;
                return (
                  <tr key={p._id} className="hover:bg-surface-alt transition-colors">
                    <td>
                      <div className="font-semibold text-sm">{p?.propertyTitle ?? '—'}</div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">{p?.code ?? '—'}</div>
                    </td>
                    <td className="text-sm text-muted">{p?.propertyType ?? '—'}</td>
                    <td className="text-sm text-muted">{location ?? '—'}</td>
                    <td>
                      <div className="text-sm">{p.referredByAgentId?.name || '—'}</div>
                    </td>
                    <td>
                      <div className="inline-flex items-center justify-center bg-accent/10 text-accent font-bold text-xs rounded-full h-6 px-3">
                        {interests.length} Agent{interests.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="text-right">
                      <button className="btn btn-sm btn-accent" onClick={() => setViewingAllotment(allotment)}>
                        <Handshake size={13} />
                        Review &amp; Allot
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category 2: Unassignment Requests */}
      <div className="card">
        <div className="card-header bg-surface-alt">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="font-bold text-sm">Unassignment Requests</span>
            <span className="text-xs text-muted ml-1">({unassignmentRequests.length})</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Deal ID</th>
                <th>Property</th>
                <th>Current Agent</th>
                <th>Location</th>
                <th>Reason</th>
                <th>Requested</th>
                <th>Waiting Agents</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted">Loading...</td></tr>
              ) : unassignmentRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <ClipboardCheck size={32} className="text-muted mx-auto mb-3 opacity-40" />
                    <p className="text-muted text-sm">No unassignment requests.</p>
                  </td>
                </tr>
              ) : unassignmentRequests.map((item: any) => {
                const p = item.property;
                const deal = item.currentDeal;
                const location = typeof p?.location === 'object' ? p.location?.location : p?.location;
                return (
                  <tr key={deal?._id} className="hover:bg-surface-alt transition-colors">
                    <td>
                      <div className="font-mono text-xs font-semibold text-accent">{deal?.dealId}</div>
                    </td>
                    <td>
                      <div className="font-semibold text-sm">{p?.propertyTitle ?? '—'}</div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">{p?.code ?? '—'}</div>
                    </td>
                    <td>
                      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-300/40 rounded-lg px-2.5 py-1.5">
                        <User size={12} className="text-amber-600 flex-shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-amber-700">{deal?.currentAgent?.name ?? '—'}</div>
                          <div className="text-[10px] text-muted">{deal?.currentAgent?.code ?? ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-muted">{location ?? '—'}</td>
                    <td className="text-sm text-muted max-w-[160px] truncate">{deal?.unassignReason || '—'}</td>
                    <td className="text-sm text-muted">{deal?.unassignRequestedAt ? fmtDate(deal.unassignRequestedAt) : '—'}</td>
                    <td>
                      <div className="inline-flex items-center justify-center bg-blue-500/10 text-blue-700 font-bold text-xs rounded-full h-6 px-3">
                        {item.interests.length}
                      </div>
                    </td>
                    <td className="text-right">
                      <button className="btn btn-sm border border-amber-400 text-amber-600 hover:bg-amber-50" onClick={() => setHandlingUnassign(item)}>
                        <RefreshCw size={13} />
                        Handle
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

    {/* ── Mobile ── */}
    
    </>
  );
}
