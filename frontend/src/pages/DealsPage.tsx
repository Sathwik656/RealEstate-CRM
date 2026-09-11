import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Handshake, Eye, CheckCircle, Building2, MapPin,
  User, Phone, Calendar, IndianRupee, Tag,
} from 'lucide-react';
import clsx from 'clsx';

function fmt(n: number | undefined) {
  if (!n) return '—';
  return '₹' + n.toLocaleString('en-IN');
}
function fmtDate(d: string | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function DealStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ongoing' ? 'badge-blue' :
    status === 'pending_approval' ? 'badge-amber' :
    status === 'completed' ? 'badge-green' : 'badge-gray';
  const label =
    status === 'ongoing' ? 'Ongoing' :
    status === 'pending_approval' ? 'Pending Approval' :
    status === 'completed' ? 'Completed' : status;
  return <span className={clsx('badge', cls)}>{label}</span>;
}

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
    <div className={clsx('rounded-lg border overflow-hidden', accent ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface')}>
      <div className={clsx('px-4 py-3 border-b flex items-center gap-2', accent ? 'border-accent/30 bg-accent/10' : 'border-border bg-surface-alt')}>
        <Icon size={14} className={clsx('flex-shrink-0', accent ? 'text-accent' : 'text-muted')} />
        <h4 className={clsx('text-xs font-bold uppercase tracking-wider', accent ? 'text-accent' : 'text-muted')}>{title}</h4>
      </div>
      <dl className="px-4">{children}</dl>
    </div>
  );
}

function DealDetailModal({ deal, onClose, onMarkDone, isMarking }: { deal: any; onClose: () => void; onMarkDone: (id: string) => void; isMarking: boolean }) {
  const p = deal.propertyId;
  const location = typeof p?.location === 'object' ? `${p.location?.location}${p.location?.code ? ` (${p.location.code})` : ''}` : p?.location;
  const seller = p?.sellerId;
  const referredAgent = p?.referredByAgentId;
  const dealAgent = deal.agentId;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl my-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 flex items-start justify-between gap-4 rounded-t-xl"
          style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #252b3b 100%)' }}>
          <div>
            <p className="text-white/50 text-xs font-mono mb-1">{deal.dealId}</p>
            <h2 className="text-white font-display font-bold text-xl">Deal Details</h2>
          </div>
          <DealStatusBadge status={deal.status} />
        </div>

        <div className="p-5 space-y-4">
          {/* Property */}
          <Section title="Property Details" icon={Building2}>
            <InfoRow label="Property Title" value={p?.propertyTitle} />
            <InfoRow label="Property Code" value={p?.code} />
            <InfoRow label="Type" value={p?.propertyType && p?.purpose ? `${p.propertyType} · ${p.purpose}` : p?.propertyType} />
            <InfoRow label="Original Price" value={fmt(p?.price)} />
            <InfoRow label="Area" value={p?.area ? `${p.area.toLocaleString()} sq ft` : null} />
            <InfoRow label="Location" value={location} />
          </Section>

          {/* Owner (Seller) */}
          <Section title="Property Owner (Seller)" icon={User}>
            {seller ? (
              <>
                <InfoRow label="Seller Name" value={seller.sellerName} />
                <InfoRow label="Contact Number" value={seller.contactNumber} />
                {seller.address && <InfoRow label="Address" value={seller.address} />}
              </>
            ) : (
              <InfoRow label="Seller" value={null} />
            )}
          </Section>

          {/* Agents */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Section title="Referred By (Listing Agent)" icon={User}>
              {referredAgent ? (
                <>
                  <InfoRow label="Agent Name" value={referredAgent.name} />
                  <InfoRow label="Agent Code" value={referredAgent.code} />
                  <InfoRow label="Email" value={referredAgent.email} />
                </>
              ) : (
                <InfoRow label="Referred By" value={null} />
              )}
            </Section>

            <Section title="Deal Agent (You)" icon={Handshake} accent>
              <InfoRow label="Agent Name" value={dealAgent?.name} />
              <InfoRow label="Agent Code" value={dealAgent?.code} />
              <InfoRow label="Email" value={dealAgent?.email} />
            </Section>
          </div>

          {/* Timeline */}
          <Section title="Deal Timeline" icon={Calendar}>
            <InfoRow label="Deal Opened" value={fmtDate(deal.createdAt)} />
            <InfoRow label="Marked Done" value={fmtDate(deal.markedDoneAt)} />
            {deal.completedAt && <InfoRow label="Completed" value={fmtDate(deal.completedAt)} />}
            {deal.closingPrice != null && <InfoRow label="Closing Price" value={fmt(deal.closingPrice)} />}
          </Section>
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-between items-center">
          {deal.status === 'ongoing' ? (
            <button
              className="btn bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
              disabled={isMarking}
              onClick={() => { onMarkDone(deal._id); onClose(); }}
            >
              <CheckCircle size={15} />
              Mark as Deal Done
            </button>
          ) : <div />}
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function DealsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [viewingDeal, setViewingDeal] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-deals', statusFilter],
    queryFn: async () => {
      const res = await api.get('/deals/my', { params: { status: statusFilter || undefined, limit: 50 } });
      return res.data;
    },
  });

  const markDoneMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/deals/${id}/done`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-deals'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      alert('Deal marked as pending approval! The admin will review it shortly.');
    },
    onError: () => alert('Failed to mark deal as done. Please try again.'),
  });

  const handleMarkDone = (id: string) => {
    if (!window.confirm('Mark this deal as done? It will be sent to admin for approval.')) return;
    markDoneMutation.mutate(id);
  };

  return (
    <div className="page-wrapper">
      {viewingDeal && (
        <DealDetailModal
          deal={viewingDeal}
          onClose={() => setViewingDeal(null)}
          onMarkDone={handleMarkDone}
          isMarking={markDoneMutation.isPending}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">My Deals</h1>
          <p className="page-subtitle">Track your property deals and their progress</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-surface-alt">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="form-select w-48"
          >
            <option value="">All Deals</option>
            <option value="ongoing">Ongoing</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="completed">Completed</option>
          </select>
          <span className="text-sm text-muted">{data?.pagination?.total ?? 0} deals</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Deal ID</th>
                <th>Property</th>
                <th>Type</th>
                <th>Price</th>
                <th>Location</th>
                <th>Status</th>
                <th>Opened</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted">Loading deals...</td></tr>
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Handshake size={36} className="text-muted mx-auto mb-3 opacity-40" />
                    <p className="text-muted text-sm">No deals found. Open a deal from the Properties page.</p>
                  </td>
                </tr>
              ) : data.data.map((deal: any) => {
                const p = deal.propertyId;
                const location = typeof p?.location === 'object' ? p.location?.location : p?.location;
                return (
                  <tr key={deal._id} className="cursor-pointer hover:bg-surface-alt transition-colors" onClick={() => setViewingDeal(deal)}>
                    <td>
                      <div className="font-mono text-xs font-semibold text-accent">{deal.dealId}</div>
                    </td>
                    <td>
                      <div className="font-semibold text-sm">{p?.propertyTitle ?? '—'}</div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">{p?.code ?? '—'}</div>
                    </td>
                    <td className="text-sm text-muted">{p?.propertyType ?? '—'}</td>
                    <td className="text-sm font-medium">{p?.price ? `₹${p.price.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="text-sm text-muted">{location ?? '—'}</td>
                    <td><DealStatusBadge status={deal.status} /></td>
                    <td className="text-sm text-muted">{new Date(deal.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button className="btn-icon hover:text-accent hover:bg-accent/10" onClick={() => setViewingDeal(deal)}>
                          <Eye size={15} />
                        </button>
                        {deal.status === 'ongoing' && (
                          <button
                            className="btn btn-sm bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                            disabled={markDoneMutation.isPending}
                            onClick={() => handleMarkDone(deal._id)}
                          >
                            <CheckCircle size={13} />
                            Deal Done
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
