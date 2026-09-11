import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { FileText, Eye, Building2, User, Handshake, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
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
      </div>
      <dl className="px-4">{children}</dl>
    </div>
  );
}

export function ReportDetailModal({ report, onClose }: { report: any; onClose: () => void }) {
  const p = report.propertyId;
  const seller = p?.sellerId;
  const referredAgent = p?.referredByAgentId;
  const dealAgent = report.agentId;
  const deal = report.dealId;
  const location = typeof p?.location === 'object' ? `${p.location?.location}${p.location?.code ? ` (${p.location.code})` : ''}` : p?.location;

  const priceDiff = report.closingPrice && report.originalPrice ? report.closingPrice - report.originalPrice : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl my-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 rounded-t-xl flex justify-between items-start" style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #252b3b 100%)' }}>
          <div>
            <p className="text-white/50 text-xs font-mono mb-1">{report.reportId}</p>
            <h2 className="text-white font-display font-bold text-xl">Sale Report</h2>
            <p className="text-white/50 text-xs mt-1">Completed on {fmtDate(report.completedAt)}</p>
          </div>
          <span className="badge badge-green">Completed</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Sale Summary - Highlighted */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
             <div className="bg-surface-alt border border-border rounded-lg p-4">
               <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1">Original Price</p>
               <p className="text-lg font-medium">{fmt(report.originalPrice)}</p>
             </div>
             <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
               <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-1">Closing Price</p>
               <p className="text-xl font-bold text-emerald-700">{fmt(report.closingPrice)}</p>
             </div>
             <div className="bg-surface-alt border border-border rounded-lg p-4">
               <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1">Difference</p>
               {priceDiff !== null ? (
                 <p className={clsx('text-lg font-medium', priceDiff >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                   {priceDiff >= 0 ? '+' : ''}{fmt(Math.abs(priceDiff))}
                 </p>
               ) : <p className="text-lg font-medium text-muted">—</p>}
             </div>
          </div>

          {/* Property */}
          <Section title="Property Details" icon={Building2}>
            <InfoRow label="Property Title" value={p?.propertyTitle} />
            <InfoRow label="Property Code" value={p?.code} />
            <InfoRow label="Type · Purpose" value={p?.propertyType && p?.purpose ? `${p.propertyType} · ${p.purpose}` : p?.propertyType} />
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

          {/* Agents */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Section title="Referred By (Listing Agent)" icon={User}>
              {referredAgent ? (
                <>
                  <InfoRow label="Name" value={referredAgent.name} />
                  <InfoRow label="Code" value={referredAgent.code} />
                  <InfoRow label="Email" value={referredAgent.email} />
                </>
              ) : (
                <InfoRow label="Referred By" value={null} />
              )}
            </Section>

            <Section title="Deal Closed By" icon={Handshake} accent>
              <InfoRow label="Name" value={dealAgent?.name} />
              <InfoRow label="Code" value={dealAgent?.code} />
              <InfoRow label="Email" value={dealAgent?.email} />
            </Section>
          </div>

          {/* Timeline */}
          {deal && (
            <Section title="Deal Timeline" icon={Calendar}>
              <InfoRow label="Deal ID" value={deal.dealId} />
              <InfoRow label="Deal Opened" value={fmtDate(deal.createdAt)} />
              <InfoRow label="Marked Done by Agent" value={fmtDate(deal.markedDoneAt)} />
              <InfoRow label="Approved by Admin" value={fmtDate(report.completedAt)} />
            </Section>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end">
          <button className="btn btn-outline" onClick={onClose}>Close Report</button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setSelectedMonth('');
      setSelectedYear('');
    } else {
      const [m, y] = val.split('-');
      setSelectedMonth(m);
      setSelectedYear(y);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['reports', selectedMonth, selectedYear],
    queryFn: async () => {
      const params: any = { limit: 50 };
      if (selectedMonth && selectedYear) {
        params.month = selectedMonth;
        params.year = selectedYear;
      }
      const res = await api.get('/reports', { params });
      return res.data;
    },
  });

  // Generate last 12 months for dropdown
  const monthOptions = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    monthOptions.push({
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      value: `${m}-${y}`
    });
  }

  return (
    <div className="page-wrapper">
      {viewingReport && (
        <ReportDetailModal report={viewingReport} onClose={() => setViewingReport(null)} />
      )}

      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div>
            <h1 className="page-title">{user?.role === 'admin' ? 'Sale Reports' : 'My Sale Reports'}</h1>
            <p className="page-subtitle">
              {user?.role === 'admin' ? 'All completed property deals' : 'Deals you closed successfully'}
            </p>
          </div>
          
          <select 
            className="input max-w-[200px]"
            onChange={handleMonthChange}
            value={selectedMonth && selectedYear ? `${selectedMonth}-${selectedYear}` : ''}
          >
            <option value="">All Months</option>
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Deal ID</th>
                <th>Property</th>
                {user?.role === 'admin' && <th>Deal Agent</th>}
                <th>Owner (Seller)</th>
                <th>Original Price</th>
                <th>Closing Price</th>
                <th>Completed Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted">Loading reports...</td></tr>
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <FileText size={36} className="text-muted mx-auto mb-3 opacity-40" />
                    <p className="text-muted text-sm">No reports yet.</p>
                  </td>
                </tr>
              ) : data.data.map((report: any) => {
                const p = report.propertyId;
                const seller = p?.sellerId;
                const priceDiff = report.closingPrice && report.originalPrice ? report.closingPrice - report.originalPrice : null;

                return (
                  <tr key={report._id} className="hover:bg-surface-alt transition-colors cursor-pointer" onClick={() => setViewingReport(report)}>
                    <td>
                      <div className="font-mono text-xs font-semibold text-accent">{report.dealId?.dealId ?? '—'}</div>
                    </td>
                    <td>
                      <div className="font-semibold text-sm">{p?.propertyTitle ?? '—'}</div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">{p?.code ?? '—'}</div>
                    </td>
                    {user?.role === 'admin' && (
                      <td>
                        <div className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/30 rounded-lg px-2 py-1">
                          <Handshake size={10} className="text-accent flex-shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-accent">{report.agentId?.name ?? '—'}</div>
                            <div className="text-[10px] text-muted">{report.agentId?.code ?? ''}</div>
                          </div>
                        </div>
                      </td>
                    )}
                    <td>
                      {seller ? (
                         <div>
                           <div className="text-sm font-medium">{seller.sellerName}</div>
                           <div className="text-xs text-muted">{seller.contactNumber}</div>
                         </div>
                      ) : <span className="text-muted text-sm italic">Not linked</span>}
                    </td>
                    <td className="text-sm text-muted">{fmt(report.originalPrice)}</td>
                    <td>
                      <div className="text-sm font-semibold text-emerald-600">
                        {fmt(report.closingPrice)}
                      </div>
                      {priceDiff !== null && (
                        <div className={`text-[10px] mt-0.5 ${priceDiff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {priceDiff >= 0 ? '+' : ''}{fmt(Math.abs(priceDiff))}
                        </div>
                      )}
                    </td>
                    <td className="text-sm text-muted">{fmtDate(report.completedAt)}</td>
                    <td className="text-right">
                       <button className="btn btn-sm btn-outline hover:bg-surface" onClick={(e) => { e.stopPropagation(); setViewingReport(report); }}>
                         <Eye size={13} />
                         View Report
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
  );
}
