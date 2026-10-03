import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ClipboardCheck, Eye, Building2, User, Handshake, Calendar, Phone, Search, ChevronRight, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';

function fmt(n: number | undefined) {
  if (!n) return '—';
  return '₹' + n.toLocaleString('en-IN');
}
function fmtDate(d: string | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
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
    <div className={clsx('rounded-lg border overflow-hidden', accent ? 'border-accent bg-accent/5' : 'border-border bg-surface')}>
      <div className={clsx('px-4 py-3 border-b flex items-center gap-2', accent ? 'border-accent/40 bg-accent/10' : 'border-border bg-surface-alt')}>
        <Icon size={14} className={clsx('flex-shrink-0', accent ? 'text-accent' : 'text-muted')} />
        <h4 className={clsx('text-xs font-bold uppercase tracking-wider', accent ? 'text-accent' : 'text-muted')}>{title}</h4>
        {accent && <span className="ml-auto text-[10px] bg-accent text-white px-2 py-0.5 rounded-full font-bold">Deal Agent</span>}
      </div>
      <dl className="px-4">{children}</dl>
    </div>
  );
}

function ApproveModal({ deal, onClose, onApproved }: { deal: any; onClose: () => void; onApproved: () => void }) {
  const [closingPrice, setClosingPrice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const p = deal.propertyId;
  const seller = p?.sellerId;
  const referredAgent = p?.referredByAgentId;
  const dealAgent = deal.agentId;
  const location = typeof p?.location === 'object' ? `${p.location?.location}${p.location?.code ? ` (${p.location.code})` : ''}` : p?.location;

  const handleApprove = async () => {
    const val = parseFloat(closingPrice);
    if (isNaN(val) || val < 0) { setError('Please enter a valid closing price.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.patch(`/deals/${deal._id}/approve`, { closingPrice: val });
      onApproved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to approve deal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="flex fixed inset-0 bg-black/60 items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl my-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 rounded-t-xl" style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #252b3b 100%)' }}>
          <p className="text-white/50 text-xs font-mono mb-1">{deal.dealId}</p>
          <h2 className="text-white font-display font-bold text-xl">Approve Deal</h2>
          <p className="text-white/50 text-xs mt-1">Review all details before approving</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Property */}
          <Section title="Property Details" icon={Building2}>
            <InfoRow label="Property Title" value={p?.propertyTitle} />
            <InfoRow label="Property Code" value={p?.code} />
            <InfoRow label="Type · Purpose" value={p?.propertyType && p?.purpose ? `${p.propertyType} · ${p.purpose}` : p?.propertyType} />
            <InfoRow label="Original Price" value={fmt(p?.price)} />
            <InfoRow label="Location" value={location} />
            <InfoRow label="Area" value={p?.area ? `${p.area.toLocaleString()} sq ft` : null} />
          </Section>

          {/* Owner */}
          <Section title="Property Owner (Seller)" icon={User}>
            {seller ? (
              <>
                <InfoRow label="Seller Name" value={seller.sellerName} />
                <InfoRow label="Contact" value={seller.contactNumber} />
                {seller.address && <InfoRow label="Address" value={seller.address} />}
              </>
            ) : (
              <InfoRow label="Seller" value={null} />
            )}
          </Section>

          {/* Agents - side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Section title="Referred By (Listing Agent)" icon={User}>
              {referredAgent ? (
                <>
                  <InfoRow label="Name" value={referredAgent.name} />
                  <InfoRow label="Code" value={referredAgent.code} />
                  {/* <InfoRow label="Email" value={referredAgent.email} /> */}
                </>
              ) : (
                <InfoRow label="Referred By" value={null} />
              )}
            </Section>

            {/* Deal agent — highlighted with accent */}
            <Section title="Deal From Agent" icon={Handshake} accent>
              <InfoRow label="Name" value={dealAgent?.name} />
              <InfoRow label="Code" value={dealAgent?.code} />
              {/* <InfoRow label="Email" value={dealAgent?.email} /> */}
            </Section>
          </div>

          {/* Timeline */}
          <Section title="Deal Timeline" icon={Calendar}>
            <InfoRow label="Deal Opened" value={fmtDate(deal.createdAt)} />
            <InfoRow label="Marked Done by Agent" value={fmtDate(deal.markedDoneAt)} />
          </Section>

          {/* Closing Price */}
          <div className="form-group">
            <label className="form-label">Closing Price (₹)</label>
            <input
              type="number"
              value={closingPrice}
              onChange={e => setClosingPrice(e.target.value)}
              placeholder="Enter final closing price..."
              className="form-input"
              min={0}
            />
            {closingPrice && !isNaN(parseFloat(closingPrice)) && (
              <p className="text-xs text-emerald-600 mt-1 font-medium">
                = ₹{parseFloat(closingPrice).toLocaleString('en-IN')}
              </p>
            )}
            {error && <p className="form-error">{error}</p>}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            ⚠️ Approving will mark the property as <strong>Sold</strong> and auto-generate a sale report. This cannot be undone.
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-accent" onClick={handleApprove} disabled={loading || !closingPrice}>
            {loading ? 'Approving...' : 'Approve Deal'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

export default function DealApprovalsPage() {
  const qc = useQueryClient();
  const [reviewingDeal, setReviewingDeal] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['deals-pending'],
    queryFn: async () => {
      const res = await api.get('/deals', { params: { status: 'pending_approval', limit: 50 } });
      return res.data;
    },
  });

  const handleApproved = () => {
    qc.invalidateQueries({ queryKey: ['deals-pending'] });
    qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    qc.invalidateQueries({ queryKey: ['reports'] });
    alert('Deal approved! Property is now Sold and a report has been generated.');
  };

  return (
    <>
    {reviewingDeal && (
      <ApproveModal deal={reviewingDeal} onClose={() => setReviewingDeal(null)} onApproved={handleApproved} />
    )}
    <div className="page-wrapper">

      <div className="page-header">
        <div>
          <h1 className="page-title">Deal Approvals</h1>
          <p className="page-subtitle">Review and approve deals submitted by agents</p>
        </div>
        {(data?.pagination?.total ?? 0) > 0 && (
          <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            {data.pagination.total} pending
          </span>
        )}
      </div>

      <div className="card">
        <div className="hidden md:block overflow-x-auto">
          <table className="data-table border-0">
            <thead>
              <tr>
                <th className="!bg-surface-alt">Deal ID</th>
                <th className="!bg-surface-alt">Property</th>
                <th className="!bg-surface-alt">Deal Agent</th>
                <th className="!bg-surface-alt">Owner (Seller)</th>
                <th className="!bg-surface-alt">Original Price</th>
                <th className="!bg-surface-alt">Deal Opened</th>
                <th className="!bg-surface-alt">Marked Done</th>
                <th className="text-right !bg-surface-alt">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted border-0">Loading...</td></tr>
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center border-0">
                    <ClipboardCheck size={36} className="text-muted mx-auto mb-3 opacity-40" />
                    <p className="text-muted text-sm">No pending deal approvals.</p>
                  </td>
                </tr>
              ) : data.data.map((deal: any) => {
                const p = deal.propertyId;
                const seller = p?.sellerId;
                return (
                  <tr key={deal._id} className="hover:bg-surface-alt/50 transition-colors">
                    <td>
                      <div className="font-mono text-xs font-semibold text-accent">{deal.dealId}</div>
                    </td>
                    <td>
                      <div className="font-semibold text-sm">{p?.propertyTitle ?? '—'}</div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">{p?.code ?? '—'}</div>
                    </td>
                    <td>
                      {/* Deal Agent — highlighted */}
                      <div className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/30 rounded-lg px-2.5 py-1.5">
                        <Handshake size={12} className="text-accent flex-shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-accent">{deal.agentId?.name ?? '—'}</div>
                          <div className="text-[10px] text-muted">{deal.agentId?.code ?? ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {seller ? (
                        <div>
                          <div className="text-sm font-medium">{seller.sellerName}</div>
                          <div className="text-xs text-muted">{seller.contactNumber}</div>
                        </div>
                      ) : <span className="text-muted text-sm italic">Not linked</span>}
                    </td>
                    <td className="text-sm font-medium">{p?.price ? `₹${p.price.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="text-sm text-muted">{new Date(deal.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="text-sm text-muted">{deal.markedDoneAt ? new Date(deal.markedDoneAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="text-right">
                      <button className="btn btn-sm btn-accent" onClick={() => setReviewingDeal(deal)}>
                        <Eye size={13} />
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-3 p-3 bg-surface-alt/30 rounded-b-lg">
          {isLoading ? (
            <div className="py-8 text-center text-muted text-sm">Loading...</div>
          ) : !data?.data?.length ? (
            <div className="py-8 text-center text-muted text-sm">No pending deal approvals.</div>
          ) : data.data.map((deal: any) => {
            const p = deal.propertyId;
            return (
              <div key={deal._id} className="border border-border rounded-lg p-3 bg-surface shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-sm text-primary">{p?.propertyTitle ?? '—'}</div>
                    <div className="text-[10px] text-muted font-mono">{p?.code ?? '—'}</div>
                  </div>
                  <div className="font-mono text-[10px] font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded">{deal.dealId}</div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/30 rounded px-2 py-1">
                    <Handshake size={10} className="text-accent" />
                    <span className="text-[10px] font-bold text-accent">{deal.agentId?.name ?? '—'}</span>
                  </div>
                  <div className="text-xs font-semibold">
                    {p?.price ? `₹${p.price.toLocaleString('en-IN')}` : '—'}
                  </div>
                </div>
                <button className="btn btn-sm btn-accent w-full justify-center" onClick={() => setReviewingDeal(deal)}>
                  <Eye size={13} />
                  Review &amp; Approve
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* Mobile UI */}
    
    </>
  );
}
