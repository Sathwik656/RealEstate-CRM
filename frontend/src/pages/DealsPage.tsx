import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Handshake, Eye, CheckCircle, Building2, MapPin,
  User, Phone, Calendar, IndianRupee, Tag, ArrowLeft
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

function MobileDealDetailView({ deal, onClose, onMarkDone, isMarking }: { deal: any; onClose: () => void; onMarkDone: (id: string) => void; isMarking: boolean }) {
  const p = deal.propertyId;
  const location = typeof p?.location === 'object' ? `${p.location?.location}${p.location?.code ? ` (${p.location.code})` : ''}` : p?.location;
  const seller = p?.sellerId;
  const referredAgent = p?.referredByAgentId;
  const dealAgent = deal.agentId;

  const statusBadgeClass = deal.status === 'ongoing' ? 'bg-[#E0E7FF] text-[#4338CA]' :
    deal.status === 'pending_approval' ? 'bg-[#FEF3C7] text-[#B45309]' :
    deal.status === 'completed' ? 'bg-[#E7F7ED] text-[#137A3B]' : 'bg-slate-100 text-slate-600';

  const statusLabel = deal.status === 'ongoing' ? 'Ongoing' :
    deal.status === 'pending_approval' ? 'Pending Approval' :
    deal.status === 'completed' ? 'Completed' : deal.status;

  return (
    <div className="w-full pb-20 font-sans">
      <div className="px-4 pt-6 pb-4">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full text-slate-500 mb-3">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Deal Details</h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">{deal.dealId}</p>
        
        <div className="mt-3">
          <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide', statusBadgeClass)}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Property */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Property Details</h2>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Property Title</span>
              <span className="text-sm font-medium text-slate-900">{p?.propertyTitle || '-'}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Code</span>
              <span className="text-sm font-medium text-slate-900 font-mono">{p?.code || '-'}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Type</span>
              <span className="text-sm font-medium text-slate-900">{p?.propertyType && p?.purpose ? `${p.propertyType} · ${p.purpose}` : p?.propertyType || '-'}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Original Price</span>
              <span className="text-sm font-medium text-slate-900">{fmt(p?.price)}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Area</span>
              <span className="text-sm font-medium text-slate-900">{p?.area ? `${p.area.toLocaleString()} sq ft` : '-'}</span>
            </div>
            <div className="flex flex-col gap-1 pt-1 border-b border-slate-50 pb-2.5 last:border-0">
              <span className="text-sm text-slate-500">Location</span>
              <span className="text-sm font-medium text-slate-900 leading-snug">{location || '-'}</span>
            </div>
          </div>
        </div>

        {/* Seller */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Seller Details</h2>
          {seller ? (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">Seller Name</span>
                <span className="text-sm font-medium text-slate-900">{seller.sellerName}</span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">Phone</span>
                <span className="text-sm font-medium text-slate-900">{seller.contactNumber}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 italic">Not set</div>
          )}
        </div>

        {/* Deal Agent */}
        <div className="bg-accent/5 rounded-2xl p-4 shadow-sm border border-accent/20">
          <h2 className="text-xs font-bold text-accent uppercase tracking-wider mb-3">Deal Agent (You)</h2>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2.5 border-b border-accent/10 last:border-0">
              <span className="text-sm text-slate-500">Agent Name</span>
              <span className="text-sm font-medium text-slate-900">{dealAgent?.name || '-'}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-accent/10 last:border-0">
              <span className="text-sm text-slate-500">Code</span>
              <span className="text-sm font-medium text-slate-900 font-mono">{dealAgent?.code || '-'}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Deal Timeline</h2>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Opened</span>
              <span className="text-sm font-medium text-slate-900">{fmtDate(deal.createdAt)}</span>
            </div>
            {deal.markedDoneAt && (
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">Marked Done</span>
                <span className="text-sm font-medium text-slate-900">{fmtDate(deal.markedDoneAt)}</span>
              </div>
            )}
            {deal.completedAt && (
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">Completed</span>
                <span className="text-sm font-medium text-emerald-600">{fmtDate(deal.completedAt)}</span>
              </div>
            )}
            {deal.closingPrice != null && (
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">Closing Price</span>
                <span className="text-sm font-medium text-emerald-600 font-bold">{fmt(deal.closingPrice)}</span>
              </div>
            )}
          </div>
        </div>

        {deal.status === 'ongoing' && (
          <div className="pt-4">
            <button
              className="w-full bg-emerald-500 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 hover:bg-emerald-600 disabled:opacity-50"
              disabled={isMarking}
              onClick={() => { onMarkDone(deal._id); onClose(); }}
            >
              <CheckCircle size={18} />
              Mark as Deal Done
            </button>
          </div>
        )}
      </div>
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
    <>
    <div className="block lg:hidden fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
      <MobileDealDetailView deal={deal} onClose={onClose} onMarkDone={onMarkDone} isMarking={isMarking} />
    </div>
    
    <div className="hidden lg:flex fixed inset-0 bg-black/60 items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
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
    </>
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
    <>
    {viewingDeal && (
      <DealDetailModal
        deal={viewingDeal}
        onClose={() => setViewingDeal(null)}
        onMarkDone={handleMarkDone}
        isMarking={markDoneMutation.isPending}
      />
    )}
    <div className="hidden lg:block page-wrapper">

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
    
    {/* Mobile UI */}
    <div className="block lg:hidden w-full pb-20 font-sans">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Deals</h1>
            <p className="text-xs text-slate-500 mt-0.5">Track ongoing & completed property deals</p>
          </div>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium shadow-2xs focus:outline-none focus:border-[#B5923E]"
          >
            <option value="">All Deals</option>
            <option value="ongoing">Ongoing</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading deals...</span>
          </div>
        ) : !data?.data?.length ? (
          <div className="py-14 px-4 bg-white rounded-2xl border border-slate-100 text-center flex flex-col items-center">
            <Handshake size={32} className="text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-800">
              {statusFilter ? 'No deals match filter' : 'No deals found'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
              {statusFilter ? 'Try switching the deal status filter.' : 'Open a deal from the Properties module to track progress.'}
            </p>
          </div>
        ) : (
          data.data.map((deal: any) => {
            const p = deal.propertyId;
            const locationName = typeof p?.location === 'object' ? p.location?.location : p?.location;
            
            const badgeClass = 
              deal.status === 'ongoing' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60' :
              deal.status === 'pending_approval' ? 'bg-amber-50 text-amber-800 border-amber-200/60' :
              deal.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-slate-100 text-slate-600';

            const badgeLabel = 
              deal.status === 'ongoing' ? 'Ongoing' :
              deal.status === 'pending_approval' ? 'Pending Approval' :
              deal.status === 'completed' ? 'Completed' : deal.status;

            return (
              <div 
                key={deal._id} 
                onClick={() => setViewingDeal(deal)}
                className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-3 cursor-pointer active:scale-[0.99] transition-transform hover:border-slate-200"
              >
                {/* Header: Title, Code, Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#B5923E] flex items-center justify-center flex-shrink-0 border border-amber-200/60">
                      <Handshake size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {p?.propertyTitle || 'Property Deal'}
                      </h3>
                      <p className="text-[11px] font-mono font-semibold text-[#B5923E] mt-0.5">{p?.code || deal.dealId}</p>
                    </div>
                  </div>
                  <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0', badgeClass)}>
                    {badgeLabel}
                  </span>
                </div>

                {/* Info Row: Location & Price */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-[180px]">
                    <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{locationName || 'Location N/A'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Original Price</span>
                    <span className="text-xs font-bold text-slate-800">{fmt(p?.price)}</span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-mono">ID: {deal.dealId}</span>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {deal.status === 'ongoing' && (
                      <button
                        onClick={() => handleMarkDone(deal._id)}
                        disabled={markDoneMutation.isPending}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1 shadow-xs disabled:opacity-50"
                      >
                        <CheckCircle size={13} />
                        <span>Deal Done</span>
                      </button>
                    )}

                    <button
                      onClick={() => setViewingDeal(deal)}
                      className="p-1.5 rounded-xl bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-100 active:scale-95 transition-all"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
    </>
  );
}
