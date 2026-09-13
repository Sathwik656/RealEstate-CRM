import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { FileText, Eye, Building2, User, Handshake, Calendar, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import clsx from 'clsx';

function fmt(n: number | undefined) {
  if (!n) return '—';
  return '₹' + n.toLocaleString('en-IN');
}

function fmtPriceAbbr(price?: number) {
  if (!price) return '₹0.0L';
  if (price >= 10000000) {
    return `₹${(price / 10000000).toFixed(2)}Cr`;
  }
  if (price >= 100000) {
    return `₹${(price / 100000).toFixed(1)}L`;
  }
  return `₹${price.toLocaleString('en-IN')}`;
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

function MobileReportDetailView({ report, onBack }: { report: any; onBack: () => void }) {
  const p = report.propertyId;
  const seller = p?.sellerId;
  const referredAgent = p?.referredByAgentId;
  const dealAgent = report.agentId;
  const deal = report.dealId;
  const location = typeof p?.location === 'object' ? `${p.location?.location}${p.location?.code ? ` (${p.location.code})` : ''}` : p?.location;

  const priceDiff = report.closingPrice && report.originalPrice ? report.closingPrice - report.originalPrice : null;

  return (
    <div className="w-full pb-20 font-sans animate-fade-in">
      {/* Header Bar */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 bg-white border-b border-slate-100 sticky top-0 z-10 shadow-2xs">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-all rounded-full hover:bg-slate-100"
          aria-label="Back to reports list"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate">
            {p?.propertyTitle || 'Sale Report'}
          </h1>
          <p className="text-xs text-slate-500 font-mono truncate">
            {report.reportId || (deal?.dealId ? `Deal: ${deal.dealId}` : 'Report Detail')}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex-shrink-0">
          Completed
        </span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Sale Financial Summary Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sale Financial Summary</h2>
          
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Original Price</span>
              <span className="text-sm font-bold text-slate-800 mt-0.5 block">{fmt(report.originalPrice)}</span>
            </div>
            
            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Closing Price</span>
              <span className="text-base font-bold text-emerald-700 mt-0.5 block">{fmt(report.closingPrice)}</span>
            </div>
          </div>

          {priceDiff !== null && (
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Price Difference</span>
              <span className={clsx('font-bold', priceDiff >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {priceDiff >= 0 ? '+' : ''}{fmt(Math.abs(priceDiff))}
              </span>
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={16} className="text-[#B5923E]" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Property Details</h2>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Title</span>
              <span className="text-xs font-semibold text-slate-900 text-right truncate max-w-[200px]">{p?.propertyTitle || '—'}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Property Code</span>
              <span className="text-xs font-mono font-semibold text-[#B5923E]">{p?.code || '—'}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Type & Purpose</span>
              <span className="text-xs font-medium text-slate-900">{p?.propertyType && p?.purpose ? `${p.propertyType} · ${p.purpose}` : p?.propertyType || '—'}</span>
            </div>
            <div className="flex justify-between items-start pb-2 border-b border-slate-50">
              <span className="text-xs text-slate-500 flex-shrink-0">Location</span>
              <span className="text-xs font-medium text-slate-900 text-right leading-snug">{location || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Area</span>
              <span className="text-xs font-medium text-slate-900">{p?.area ? `${p.area.toLocaleString()} sq ft` : '—'}</span>
            </div>
          </div>
        </div>

        {/* Deal Details */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Handshake size={16} className="text-[#B5923E]" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Deal Details</h2>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Deal ID</span>
              <span className="text-xs font-mono font-semibold text-slate-900">{deal?.dealId || '—'}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Deal Status</span>
              <span className="text-xs font-semibold text-emerald-600">Completed & Approved</span>
            </div>
            {deal?.createdAt && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-xs text-slate-500">Deal Opened</span>
                <span className="text-xs font-medium text-slate-900">{fmtDate(deal.createdAt)}</span>
              </div>
            )}
            {deal?.markedDoneAt && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-xs text-slate-500">Marked Done by Agent</span>
                <span className="text-xs font-medium text-slate-900">{fmtDate(deal.markedDoneAt)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Approved Date</span>
              <span className="text-xs font-medium text-slate-900">{fmtDate(report.completedAt)}</span>
            </div>
          </div>
        </div>

        {/* Agent Details */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <User size={16} className="text-[#B5923E]" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Agent Details</h2>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Deal Closed By</span>
              <span className="text-xs font-bold text-slate-900">{dealAgent?.name || '—'}</span>
            </div>
            {dealAgent?.code && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-xs text-slate-500">Agent Code</span>
                <span className="text-xs font-mono font-semibold text-[#B5923E]">{dealAgent.code}</span>
              </div>
            )}
            {dealAgent?.email && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-xs text-slate-500">Email</span>
                <span className="text-xs font-medium text-slate-900 truncate max-w-[180px]">{dealAgent.email}</span>
              </div>
            )}

            {referredAgent && (
              <>
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Referred By (Listing Agent)</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-xs text-slate-500">Name</span>
                  <span className="text-xs font-semibold text-slate-900">{referredAgent.name}</span>
                </div>
                {referredAgent.code && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                    <span className="text-xs text-slate-500">Code</span>
                    <span className="text-xs font-mono font-semibold text-slate-700">{referredAgent.code}</span>
                  </div>
                )}
                {referredAgent.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Email</span>
                    <span className="text-xs font-medium text-slate-900 truncate max-w-[180px]">{referredAgent.email}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Seller Details */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <User size={16} className="text-[#B5923E]" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Seller Details</h2>
          </div>
          {seller ? (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-xs text-slate-500">Seller Name</span>
                <span className="text-xs font-bold text-slate-900">{seller.sellerName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-xs text-slate-500">Contact Number</span>
                <span className="text-xs font-medium text-slate-900">{seller.contactNumber || '—'}</span>
              </div>
              {seller.address && (
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-500 flex-shrink-0">Address</span>
                  <span className="text-xs font-medium text-slate-900 text-right leading-snug">{seller.address}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No seller information linked</p>
          )}
        </div>

        {/* Report Information */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-[#B5923E]" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Report Information</h2>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Report ID</span>
              <span className="text-xs font-mono font-semibold text-slate-900">{report.reportId || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Completion Date</span>
              <span className="text-xs font-medium text-slate-900">{fmtDate(report.completedAt)}</span>
            </div>
          </div>
        </div>
      </div>
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
    <>
    <div className="hidden lg:block page-wrapper">
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
    
    {/* Mobile UI */}
    <div className="block lg:hidden w-full pb-20 font-sans">
      {viewingReport ? (
        <MobileReportDetailView report={viewingReport} onBack={() => setViewingReport(null)} />
      ) : (
        <>
          <div className="px-4 pt-6 pb-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
              <select 
                className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium shadow-2xs focus:outline-none focus:border-[#B5923E]"
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

          <div className="px-4 space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading reports...</span>
              </div>
            ) : !data?.data?.length ? (
              <div className="py-14 px-4 bg-white rounded-2xl border border-slate-100 text-center flex flex-col items-center">
                <FileText size={32} className="text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-800">No reports found</p>
                <p className="text-xs text-slate-500 mt-1">Completed deal reports will appear here.</p>
              </div>
            ) : (
              data.data.map((report: any) => {
                const p = report.propertyId;
                const dealAgentName = report.agentId?.name || report.dealId?.agentId?.name || 'Agent';
                const displayPrice = report.closingPrice || p?.price || 0;

                return (
                  <div 
                    key={report._id} 
                    onClick={() => setViewingReport(report)}
                    className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-3 relative cursor-pointer active:scale-[0.99] transition-transform hover:border-slate-200"
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <FileText size={20} />
                    </div>

                    {/* Report Text Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {p?.propertyTitle || 'Property Sale'}
                      </h3>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400 flex-shrink-0" />
                          {new Date(report.completedAt || report.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 truncate">
                          <User size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{dealAgentName}</span>
                        </span>
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-emerald-600">
                        {fmtPriceAbbr(displayPrice)}
                      </span>
                      <ChevronRight size={18} className="text-slate-300" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
    </>
  );
}
