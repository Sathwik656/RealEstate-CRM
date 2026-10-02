import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft, User, Calendar, FileText, Eye, Download, Handshake, CheckCircle, RefreshCw, X, Building2, MapPin, Clock, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { ReportDetailModal } from './ReportsPage';
import { AllotModal, UnassignRequestModal } from './AllotmentsPage';

// ─── Shared Formatters ────────────────────────────────────────────────────────
function fmt(n: number | undefined | null) {
  if (!n) return '—';
  return '₹' + n.toLocaleString('en-IN');
}
function fmtDate(d: string | undefined | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Modal Components (Simplified for Agent Page) ───────────────────────────

function DirectReassignModal({ deal, property, onClose, onReassigned }: { deal: any, property: any, onClose: () => void, onReassigned: () => void }) {
  const qc = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [reason, setReason] = useState('');

  const { data: interestsData, isLoading } = useQuery({
    queryKey: ['property-interests', property._id],
    queryFn: async () => (await api.get(`/properties/${property._id}/interests`)).data.data
  });

  const reassignMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/reassignments/${deal._id}/reassign`, data),
    onSuccess: () => {
      qc.invalidateQueries();
      alert('Property reassigned successfully.');
      onReassigned();
      onClose();
    },
    onError: (err: any) => alert(err?.response?.data?.message || 'Reassignment failed.')
  });

  const waitingInterests = (interestsData || []).filter((i: any) => ['waiting', 'interested'].includes(i.status));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-primary mb-1">Reassign Property</h2>
        <p className="text-xs text-muted mb-4">{property.propertyTitle} ({property.code})</p>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted uppercase block mb-2">Select New Agent</label>
            {isLoading ? <p className="text-xs text-muted">Loading agents...</p> : waitingInterests.length === 0 ? (
              <p className="text-xs text-muted italic">No other agents are waiting for this property.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 border border-border rounded-lg p-2">
                {waitingInterests.map((interest: any) => (
                  <div key={interest._id} onClick={() => setSelectedAgentId(interest.agentId._id)}
                    className={clsx('p-2 border rounded-lg cursor-pointer flex justify-between items-center', selectedAgentId === interest.agentId._id ? 'border-accent bg-accent/10' : 'border-transparent bg-surface-alt hover:border-border')}>
                    <div>
                      <p className="text-sm font-bold text-primary">{interest.agentId.name}</p>
                      <p className="text-[10px] text-muted">{interest.agentId.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase block mb-1">Reason (Optional)</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="input" placeholder="Admin note..." />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={() => reassignMutation.mutate({ newAgentId: selectedAgentId, reason })} disabled={!selectedAgentId || reassignMutation.isPending}>
            {reassignMutation.isPending ? 'Processing...' : 'Confirm Reassign'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DealStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    ongoing:            { cls: 'badge-blue',   label: 'Ongoing' },
    unassign_requested: { cls: 'badge-amber',  label: 'Unassignment Requested' },
    pending_approval:   { cls: 'badge-amber',  label: 'Pending Approval' },
    completed:          { cls: 'badge-green',  label: 'Completed' },
  };
  const { cls, label } = map[status] ?? { cls: 'badge-gray', label: status };
  return <span className={clsx('badge', cls)}>{label}</span>;
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AgentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'current' | 'interested' | 'completed' | 'returned' | 'history'>('current');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); 
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Modals state
  const [directReassignDeal, setDirectReassignDeal] = useState<any>(null); // For Reassign (Ongoing)
  const [unassignRequestDeal, setUnassignRequestDeal] = useState<any>(null); // For Handle Unassignment
  const [allotPropertyInt, setAllotPropertyInt] = useState<any>(null); // For Allot (Interested)

  // Fetch interests wrapper for AllotModal
  const { data: allotInterestsData } = useQuery({
    queryKey: ['property-interests', allotPropertyInt?.propertyId?._id],
    queryFn: async () => (await api.get(`/properties/${allotPropertyInt?.propertyId?._id}/interests`)).data.data,
    enabled: !!allotPropertyInt
  });

  // Fetch interests wrapper for UnassignRequestModal
  const { data: unassignInterestsData } = useQuery({
    queryKey: ['property-interests', unassignRequestDeal?.propertyId?._id],
    queryFn: async () => (await api.get(`/properties/${unassignRequestDeal?.propertyId?._id}/interests`)).data.data,
    enabled: !!unassignRequestDeal
  });

  const unallotMutation = useMutation({
    mutationFn: (dealId: string) => api.patch(`/reassignments/${dealId}/unallot`),
    onSuccess: () => {
      qc.invalidateQueries();
      alert('Property unallotted successfully.');
    },
    onError: (err: any) => alert(err?.response?.data?.message || 'Unallot failed.')
  });

  // Parse selected value back to month/year for the API
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.get(`/reports/agents/${id}/export`, {
        params: { month: selectedMonth, year: selectedYear },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      let fileName = 'Export.xlsx';
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('attachment') !== -1) {
        var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        var matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          fileName = matches[1].replace(/['"]/g, '');
        }
      }
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to export reports. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // 1. Fetch Agent Dashboard Data (Current, Interested, Reassigned, History)
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['agent-dashboard', id],
    queryFn: async () => {
      const res = await api.get(`/users/agents/${id}/dashboard`);
      return res.data?.data;
    },
  });

  // 2. Fetch Reports Data (for Completed Deals with filtering)
  const { data: reportsData, isLoading: isLoadingReports } = useQuery({
    queryKey: ['reports', id, selectedMonth, selectedYear],
    queryFn: async () => {
      const params: any = { agentId: id, limit: 100 };
      if (selectedMonth && selectedYear) {
        params.month = selectedMonth;
        params.year = selectedYear;
      }
      const res = await api.get('/reports', { params });
      return res.data;
    },
  });

  const monthOptions = useMemo(() => {
    const opts = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      opts.push({
        label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        value: `${d.getMonth() + 1}-${d.getFullYear()}`
      });
    }
    return opts;
  }, []);

  const agent = dashboardData?.agent;
  const currentProperties = dashboardData?.currentProperties || [];
  const interestedProperties = dashboardData?.interestedProperties || [];
  const reassignedProperties = dashboardData?.reassignedProperties || [];
  const assignmentHistory = dashboardData?.assignmentHistory || [];
  const reports = reportsData?.data || [];

  return (
    <>
    {viewingReport && (
      <ReportDetailModal report={viewingReport} onClose={() => setViewingReport(null)} />
    )}
    
    {directReassignDeal && (
      <DirectReassignModal 
        deal={directReassignDeal} 
        property={directReassignDeal.propertyId} 
        onClose={() => setDirectReassignDeal(null)} 
        onReassigned={() => qc.invalidateQueries()} 
      />
    )}

    {allotPropertyInt && allotInterestsData && (
      <AllotModal 
        allotment={{
          property: allotPropertyInt.propertyId,
          interests: allotInterestsData.map((i: any) => ({
            _id: i._id,
            agent: i.agentId,
            status: i.status,
            expressedAt: i.createdAt
          }))
        }} 
        onClose={() => setAllotPropertyInt(null)} 
        onAllotted={() => qc.invalidateQueries()} 
      />
    )}

    {unassignRequestDeal && unassignInterestsData && (
      <UnassignRequestModal 
        item={{
          property: unassignRequestDeal.propertyId,
          currentDeal: {
            ...unassignRequestDeal,
            currentAgent: agent
          },
          interests: unassignInterestsData.map((i: any) => ({
            _id: i._id,
            agent: i.agentId,
            status: i.status,
            expressedAt: i.createdAt
          }))
        }} 
        onClose={() => setUnassignRequestDeal(null)} 
        onHandled={() => qc.invalidateQueries()} 
      />
    )}

    {/* Desktop View */}
    <div className="page-wrapper max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/agents" className="btn-icon bg-surface border border-border hover:bg-surface-alt">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="page-title">Agent Management</h1>
          <p className="page-subtitle">Centralized view of agent properties, deals, and history</p>
        </div>
      </div>

      {isLoadingDashboard ? (
        <div className="p-8 text-center text-muted">Loading agent dashboard...</div>
      ) : !agent ? (
        <div className="p-8 text-center text-red-500">Agent not found.</div>
      ) : (
        <div className="space-y-6">
          {/* Agent Information */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #252b3b 100%)' }}>
            <div className="p-6 flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center border border-accent/40 flex-shrink-0">
                <User size={32} className="text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-white mb-1">{agent.name}</h2>
                <div className="flex items-center gap-4 text-white/70 text-sm">
                  <span className="font-mono bg-black/20 px-2 py-0.5 rounded text-accent border border-black/10 shadow-sm">{agent.code || 'NO-CODE'}</span>
                  {/* <span>{agent.email}</span> */}
                  {agent.phone && <span>{agent.phone}</span>}
                  <div className="flex items-center gap-1.5 border-l border-white/20 pl-4">
                    <Calendar size={14} />
                    <span>Joined {new Date(agent.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto gap-4 border-b border-border hide-scrollbar">
            <button
              onClick={() => setActiveTab('current')}
              className={clsx(
                "pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
                activeTab === 'current' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
              )}
            >
              Current Properties
              <span className="bg-surface-alt border border-border px-1.5 py-0.5 rounded text-xs">{currentProperties.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('interested')}
              className={clsx(
                "pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
                activeTab === 'interested' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
              )}
            >
              Interested Properties
              <span className="bg-surface-alt border border-border px-1.5 py-0.5 rounded text-xs">{interestedProperties.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={clsx(
                "pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
                activeTab === 'completed' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
              )}
            >
              Completed Deals
              <span className="bg-surface-alt border border-border px-1.5 py-0.5 rounded text-xs">{reports.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('returned')}
              className={clsx(
                "pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
                activeTab === 'returned' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
              )}
            >
              Returned / Reassigned
              <span className="bg-surface-alt border border-border px-1.5 py-0.5 rounded text-xs">{reassignedProperties.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={clsx(
                "pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
                activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
              )}
            >
              History Log
              <span className="bg-surface-alt border border-border px-1.5 py-0.5 rounded text-xs">{assignmentHistory.length}</span>
            </button>
          </div>

          {/* Current Properties */}
          {activeTab === 'current' && (
          <div className="card">
            <div className="card-header bg-surface-alt flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Handshake size={16} className="text-accent" />
                <h3 className="font-bold text-primary">Current Properties</h3>
                <span className="badge badge-gray ml-2">{currentProperties.length}</span>
              </div>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Location</th>
                    <th>Original Price</th>
                    <th>Current Deal Status</th>
                    <th>Assigned Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProperties.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-muted">No active properties currently assigned.</td></tr>
                  ) : currentProperties.map((deal: any) => {
                    const p = deal.propertyId;
                    const location = typeof p?.location === 'object' ? p.location?.location : p?.location;
                    return (
                      <tr key={deal._id}>
                        <td>
                          <div className="font-semibold text-sm">{p?.propertyTitle || '—'}</div>
                          <div className="text-[10px] text-muted font-mono mt-0.5">{p?.code || '—'}</div>
                        </td>
                        <td className="text-sm text-muted">{location || '—'}</td>
                        <td className="text-sm font-medium">{fmt(p?.price)}</td>
                        <td>
                          <div className="flex flex-col gap-1 items-start">
                            <DealStatusBadge status={deal.status} />
                            {deal.status === 'unassign_requested' && (
                              <span className="text-[10px] text-amber-600">Pending admin action</span>
                            )}
                          </div>
                        </td>
                        <td className="text-sm text-muted">{fmtDate(deal.createdAt)}</td>
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={`/properties/${p?.code}`} className="btn-icon hover:bg-surface-alt">
                              <Eye size={16} />
                            </Link>
                            {deal.status === 'unassign_requested' ? (
                              <button onClick={() => setUnassignRequestDeal(deal)} className="btn btn-sm border border-amber-400 text-amber-600 hover:bg-amber-50 inline-flex items-center gap-1">
                                <RefreshCw size={13} /> Manage Request
                              </button>
                            ) : (
                              <>
                                <button onClick={() => setDirectReassignDeal(deal)} className="btn btn-sm btn-outline inline-flex items-center gap-1">
                                  <RefreshCw size={13} /> Reassign
                                </button>
                                <button onClick={() => {
                                  if(window.confirm('Are you sure you want to unallot this property from the agent?')) {
                                    unallotMutation.mutate(deal._id);
                                  }
                                }} className="btn btn-sm btn-outline border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1" disabled={unallotMutation.isPending}>
                                  <X size={13} /> Unallot
                                </button>
                              </>
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
          )}

          {/* Interested Properties — Waiting for Allotment */}
          {activeTab === 'interested' && (
          <div className="card">
            <div className="card-header bg-surface-alt flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                <h3 className="font-bold text-primary">Interested Properties — Waiting for Allotment</h3>
                <span className="badge badge-gray ml-2">{interestedProperties.length}</span>
              </div>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Expressed Interest</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interestedProperties.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-muted">No interested properties waiting for allotment.</td></tr>
                  ) : interestedProperties.map((interest: any) => {
                    const p = interest.propertyId;
                    const location = typeof p?.location === 'object' ? p.location?.location : p?.location;
                    return (
                      <tr key={interest._id}>
                        <td>
                          <div className="font-semibold text-sm">{p?.propertyTitle || '—'}</div>
                          <div className="text-[10px] text-muted font-mono mt-0.5">{p?.code || '—'}</div>
                        </td>
                        <td className="text-sm text-muted">{location || '—'}</td>
                        <td><InterestStatusBadge status={interest.status} /></td>
                        <td className="text-sm text-muted">{fmtDate(interest.createdAt)}</td>
                        <td className="text-right flex items-center justify-end gap-2">
                          <Link to={`/properties/${p?.code}`} className="btn-icon hover:bg-surface-alt">
                            <Eye size={16} />
                          </Link>
                          <button onClick={() => setAllotPropertyInt(interest)} className="btn btn-sm btn-accent inline-flex items-center gap-1">
                            Allot Property
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Completed Deals */}
          {activeTab === 'completed' && (
          <div className="card">
            <div className="card-header bg-surface-alt flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" />
                <h3 className="font-bold text-primary">Completed Deals</h3>
                <span className="badge badge-gray ml-2">{reports.length}</span>
              </div>
              <div className="flex items-center gap-3">
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
                <button className="btn btn-accent" onClick={handleExport} disabled={isExporting}>
                  <Download size={16} /> {isExporting ? 'Exporting...' : 'Export Excel'}
                </button>
              </div>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Deal ID</th>
                    <th className="text-right">Original Price</th>
                    <th className="text-right">Closing Price</th>
                    <th>Completed Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingReports ? (
                    <tr><td colSpan={6} className="py-8 text-center text-muted">Loading completed deals...</td></tr>
                  ) : reports.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-muted">No completed deals in this period.</td></tr>
                  ) : reports.map((r: any) => (
                    <tr key={r._id}>
                      <td>
                        <div className="font-semibold text-sm">{r.propertyId?.propertyTitle || '—'}</div>
                        <div className="text-[10px] text-muted font-mono mt-0.5">{r.propertyId?.code || '—'}</div>
                      </td>
                      <td>
                        <div className="font-mono text-xs font-semibold text-primary">{r.reportId}</div>
                      </td>
                      <td className="text-right text-muted line-through text-xs">{fmt(r.originalPrice)}</td>
                      <td className="text-right font-bold text-emerald-600 text-sm">{fmt(r.closingPrice)}</td>
                      <td className="text-sm text-muted">{fmtDate(r.completedAt)}</td>
                      <td className="text-right flex items-center justify-end gap-2">
                        <button className="btn btn-sm btn-outline inline-flex items-center gap-1" onClick={() => setViewingReport(r)}>
                          <FileText size={13} /> View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Returned / Reassigned */}
          {activeTab === 'returned' && (
          <div className="card">
            <div className="card-header bg-surface-alt flex justify-between items-center">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-amber-500" />
                <h3 className="font-bold text-primary">Returned / Reassigned</h3>
                <span className="badge badge-gray ml-2">{reassignedProperties.length}</span>
              </div>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Assignment Date</th>
                    <th>Returned/Reassigned Date</th>
                    <th>Reason</th>
                    <th>Current Agent</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reassignedProperties.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-muted">No returned or reassigned properties.</td></tr>
                  ) : reassignedProperties.map((hist: any) => {
                    const p = hist.propertyId;
                    const deal = hist.dealId;
                    const isReassigned = deal && deal.currentAgentId;
                    return (
                      <tr key={hist._id}>
                        <td>
                          <div className="font-semibold text-sm">{p?.propertyTitle || '—'}</div>
                          <div className="text-[10px] text-muted font-mono mt-0.5">{p?.code || '—'}</div>
                        </td>
                        <td className="text-sm text-muted">{fmtDate(hist.createdAt)}</td>
                        <td className="text-sm text-amber-700 font-medium">{fmtDate(hist.endedAt)}</td>
                        <td className="text-sm text-muted max-w-[200px] truncate">{hist.reason || '—'}</td>
                        <td>
                          {isReassigned ? (
                            <div className="flex items-center gap-1 text-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex">
                              <User size={12} />
                              <span className="font-medium">{deal.currentAgentId.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted italic">Returned to Allotment</span>
                          )}
                        </td>
                        <td className="text-right">
                          <Link to={`/properties/${p?.code}`} className="btn btn-sm btn-outline inline-flex items-center gap-1">
                            <RefreshCw size={13} /> View History
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Full Assignment History */}
          {activeTab === 'history' && (
          <div className="card">
            <div className="card-header bg-surface-alt flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-slate-500" />
                <h3 className="font-bold text-primary">Assignment History Log</h3>
                <span className="badge badge-gray ml-2">{assignmentHistory.length}</span>
              </div>
            </div>
            <div className="p-4">
              {assignmentHistory.length === 0 ? (
                <div className="py-8 text-center text-muted">No assignment history.</div>
              ) : (
                <div className="relative border-l-2 border-border ml-3 space-y-6 pb-4">
                  {assignmentHistory.map((hist: any, index: number) => {
                    const p = hist.propertyId;
                    const isEnded = !!hist.endedAt;
                    const wasReassignedToMe = hist.assignmentType === 'reassignment' && hist.agentId?._id === agent._id;
                    const iWasUnassigned = isEnded && hist.agentId?._id === agent._id;

                    return (
                      <div key={hist._id} className="relative pl-6">
                        <div className={clsx(
                          "absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white",
                          wasReassignedToMe ? "bg-emerald-500" : iWasUnassigned ? "bg-amber-500" : "bg-blue-500"
                        )} />
                        
                        <div className="bg-surface border border-border rounded-lg p-4 shadow-sm relative">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-bold text-sm text-primary">{p?.propertyTitle}</h4>
                              <span className="text-[10px] font-mono text-muted">{p?.code}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-muted bg-surface-alt px-2 py-1 rounded">
                              {fmtDate(hist.createdAt)}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs text-muted mt-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-primary block w-24">Action:</span>
                              <span>{hist.assignmentType === 'initial' ? 'Initial Assignment' : 'Reassignment'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-primary block w-24">Assigned To:</span>
                              <span className={clsx("font-medium", hist.agentId?._id === agent._id ? "text-accent" : "")}>
                                {hist.agentId?.name} ({hist.agentId?.code})
                              </span>
                            </div>
                            {hist.previousAgentId && (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-primary block w-24">Previous Agent:</span>
                                <span>{hist.previousAgentId?.name} ({hist.previousAgentId?.code})</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-primary block w-24">Assigned By:</span>
                              <span>{hist.assignedBy?.name || 'Admin'}</span>
                            </div>
                          </div>

                          {isEnded && (
                            <div className="mt-3 pt-3 border-t border-border/50 bg-amber-50/50 -mx-4 -mb-4 p-4 rounded-b-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs font-bold text-amber-700">Assignment Ended</p>
                                  {hist.reason && <p className="text-[11px] text-amber-600 mt-0.5">Reason: {hist.reason}</p>}
                                </div>
                                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/50 px-2 py-1 rounded">
                                  {fmtDate(hist.endedAt)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}
    </div>

    {/* Mobile UI (Compact layout for the exact same sections) */}
    
    </>
  );
}
