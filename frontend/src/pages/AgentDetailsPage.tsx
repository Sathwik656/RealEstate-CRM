import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft, User, Calendar, FileText, Eye, Download } from 'lucide-react';
import clsx from 'clsx';
import { ReportDetailModal } from './ReportsPage'; // We need to export this or just build a similar one.

export default function AgentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // Format: MM-YYYY or just ''
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);

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
        responseType: 'blob' // Important for file download
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

  const { data: agentData, isLoading: isLoadingAgent } = useQuery({
    queryKey: ['agent', id],
    queryFn: async () => {
      const res = await api.get(`/users/agents/${id}`);
      return res.data;
    },
  });

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

  const agent = agentData?.data;

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
    <div className="page-wrapper max-w-5xl">
      {viewingReport && (
        <ReportDetailModal report={viewingReport} onClose={() => setViewingReport(null)} />
      )}

      <div className="flex items-center gap-4 mb-6">
        <Link to="/agents" className="btn-icon bg-surface border border-border hover:bg-surface-alt">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="page-title">Agent Details</h1>
          <p className="page-subtitle">View agent profile and sales performance</p>
        </div>
      </div>

      {isLoadingAgent ? (
        <div className="p-8 text-center text-muted">Loading agent...</div>
      ) : !agent ? (
        <div className="p-8 text-center text-red-500">Agent not found.</div>
      ) : (
        <>
          {/* Agent Header Card */}
          <div className="card mb-6" style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #252b3b 100%)' }}>
            <div className="p-6 sm:p-8 flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center border border-accent/40 flex-shrink-0">
                <User size={32} className="text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-white mb-1">{agent.name}</h2>
                <div className="flex items-center gap-4 text-white/70 text-sm">
                  <span className="font-mono bg-black/20 px-2 py-0.5 rounded text-accent">{agent.code || 'NO-CODE'}</span>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>Joined {new Date(agent.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reports Section */}
          <div className="card">
            <div className="card-header bg-surface-alt flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-accent" />
                <h3 className="font-bold text-primary">Completed Reports</h3>
                <span className="badge badge-gray ml-2">{reportsData?.data?.length || 0}</span>
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
                
                <button 
                  className="btn btn-accent" 
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  <Download size={16} />
                  {isExporting ? 'Exporting...' : 'Export Excel'}
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Report ID / Date</th>
                    <th>Property</th>
                    <th>Owner (Seller)</th>
                    <th className="text-right">Original Price</th>
                    <th className="text-right">Closing Price</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingReports ? (
                    <tr><td colSpan={6} className="py-12 text-center text-muted">Loading reports...</td></tr>
                  ) : !reportsData?.data?.length ? (
                    <tr><td colSpan={6} className="py-12 text-center text-muted">No reports found for the selected period.</td></tr>
                  ) : (
                    reportsData.data.map((r: any) => (
                      <tr key={r._id}>
                        <td>
                          <div className="font-mono font-bold text-primary text-xs">{r.reportId}</div>
                          <div className="text-[10px] text-muted mt-0.5">
                            {new Date(r.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td>
                          <div className="font-semibold text-sm">{r.propertyId?.propertyTitle || '—'}</div>
                          <div className="text-[10px] text-muted font-mono mt-0.5">{r.propertyId?.code || '—'}</div>
                        </td>
                        <td>
                          <div className="text-sm">{r.propertyId?.sellerId?.sellerName || '—'}</div>
                        </td>
                        <td className="text-right text-muted line-through text-xs">
                          {r.originalPrice ? `₹${r.originalPrice.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="text-right font-bold text-emerald-600 text-sm">
                          ₹{r.closingPrice?.toLocaleString('en-IN')}
                        </td>
                        <td className="text-right">
                          <button 
                            className="btn-icon hover:text-accent hover:bg-accent/10"
                            onClick={() => setViewingReport(r)}
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
