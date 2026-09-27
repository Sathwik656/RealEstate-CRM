import { Link } from 'react-router-dom';
import {
  Building2,
  Tag,
  Users,
  Clock,
  Handshake,
  Plus,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Mini SVG Sparkline Component
function Sparkline({ color }: { color: string }) {
  return (
    <svg className="w-14 h-6 overflow-visible" viewBox="0 0 50 20" fill="none">
      <path
        d="M2 16 Q 12 4, 25 12 T 48 3"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function DesktopDashboard({ statsData, chartsData, recentPropertiesData, notifications, isAdmin }: any) {
  const kpiCards = [
    {
      title: 'Total Properties',
      value: statsData?.totalProperties ?? 0,
      icon: Building2,
      subInfo: (
        <div className="flex items-center gap-1.5 text-[10px] text-muted font-medium">
          <span>{statsData?.availableProperties ?? 0} Avail</span>•
          <span>{statsData?.inDealProperties ?? 0} Deal</span>•
          <span>{statsData?.soldProperties ?? 0} Sold</span>
        </div>
      ),
      link: '/properties',
    },
    {
      title: 'Total Sellers',
      value: statsData?.totalSellers ?? 0,
      icon: Tag,
      subInfo: (
        <div className="text-[10px] text-muted font-medium">
          <span className="text-[#B5923E] font-bold">+{statsData?.recentSellers ?? 0}</span> recently added
        </div>
      ),
      link: '/sellers',
    },
    {
      title: 'Total Buyers',
      value: statsData?.totalBuyers ?? 0,
      icon: Users,
      subInfo: (
        <div className="text-[10px] text-muted font-medium">
          <span className="text-[#B5923E] font-bold">+{statsData?.recentBuyers ?? 0}</span> recently added
        </div>
      ),
      link: '/buyers',
    },
    ...(isAdmin ? [{
      title: 'Pending Approvals',
      value: statsData?.pendingApprovals ?? 0,
      icon: Clock,
      statusMsg: (statsData?.pendingApprovals ?? 0) > 0 ? 'Needs attention' : 'All caught up',
      statusType: (statsData?.pendingApprovals ?? 0) > 0 ? 'warning' : 'success',
      link: '/deal-approvals',
    }] : []),
    isAdmin
      ? {
        title: 'Allotment Requests',
        value: statsData?.allotmentRequests ?? 0,
        icon: Handshake,
        statusMsg: (statsData?.allotmentRequests ?? 0) > 0 ? 'Action required' : 'No pending requests',
        statusType: (statsData?.allotmentRequests ?? 0) > 0 ? 'warning' : 'success',
        link: '/allotments',
      }
      : {
        title: 'Ongoing Deals',
        value: statsData?.ongoingDeals ?? 0,
        icon: Handshake,
        statusMsg: 'Active pipeline',
        statusType: 'neutral',
        link: '/deals',
      },
  ];

  const propertyTypes = chartsData?.propertyTypeDistribution ?? [
    { type: 'Residential', count: 9 },
    { type: 'Commercial', count: 3 },
    { type: 'Land / Plots', count: 2 },
  ];
  const totalProps = propertyTypes.reduce((acc: number, curr: any) => acc + curr.count, 0) || 1;

  return (
    <div className="page-wrapper space-y-6">
      {/* 1. Slim, Elegant Greeting Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border/80 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-display font-bold text-primary tracking-tight">
              Welcome back, Verandah Reality
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Here is an overview of your real estate portfolio, metrics, and active deals.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {isAdmin && (
            <Link
              to="/properties"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-light text-xs font-semibold shadow-xs transition-all"
            >
              <Plus size={15} />
              <span>Add Property</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Live Metrics Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-display font-bold text-primary tracking-tight">Live Metrics</h2>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Live</span>
          </div>
        </div>
        <p className="text-xs text-muted mt-0.5">Real-time overview of your CRM activity</p>
      </div>

      {/* 5 Core KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              to={kpi.link}
              className="group flex flex-col p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-[#B5923E]/40 transition-all duration-200 relative overflow-hidden"
            >
              {/* Highlight bar for attention items */}
              {kpi.statusType === 'warning' && (
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
              )}
              
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-600 group-hover:text-[#B5923E] group-hover:bg-[#B5923E]/5 transition-colors">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
              </div>
              
              <div className="mt-1">
                <p className="text-3xl font-display font-bold text-slate-900 group-hover:text-[#B5923E] transition-colors">{kpi.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5 tracking-tight">{kpi.title}</p>
              </div>

              {/* Secondary Info area */}
              <div className="mt-3 pt-3 border-t border-slate-100 min-h-[36px] flex items-center">
                {kpi.subInfo ? (
                  kpi.subInfo
                ) : kpi.statusMsg ? (
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md ${
                    kpi.statusType === 'warning' 
                      ? 'bg-amber-50 text-amber-700' 
                      : kpi.statusType === 'success'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-50 text-slate-600'
                  }`}>
                    {kpi.statusType === 'warning' && <AlertCircle size={10} />}
                    {kpi.statusType === 'success' && <CheckCircle2 size={10} />}
                    {kpi.statusMsg}
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      {/* 3. Supplementary Below-the-Fold Sections (60% Left / 40% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left 60% (3 Cols): Recently Added Properties */}
        <div className="lg:col-span-3 card p-5 flex flex-col justify-between bg-surface border border-border/80 rounded-2xl">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
                  Recently Added Properties
                </h2>
              </div>
              <Link
                to="/properties"
                className="text-xs font-semibold text-accent hover:text-accent-dark flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight size={14} />
              </Link>
            </div>

            {/* Properties Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted font-medium uppercase text-[10px] tracking-wider bg-surface-alt/60">
                    <th className="py-2.5 px-3 rounded-l-lg">Property</th>
                    <th className="py-2.5 px-3">Seller of the property</th>
                    <th className="py-2.5 px-3">Value</th>
                    <th className="py-2.5 px-3 rounded-r-lg text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentPropertiesData?.map((prop: any) => {
                    let statusBg = 'bg-slate-100 text-slate-700 border-slate-200';
                    if (prop.propertyStatus === 'Available') statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
                    if (prop.propertyStatus === 'In Deal') statusBg = 'bg-amber-50 text-amber-700 border-amber-200/80';
                    if (prop.propertyStatus === 'Sold') statusBg = 'bg-blue-50 text-blue-700 border-blue-200/80';
                    if (prop.propertyStatus === 'In Allotment') statusBg = 'bg-violet-50 text-violet-700 border-violet-200/80';

                    return (
                      <tr key={prop._id} className="hover:bg-surface-alt/50 transition-colors group">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-primary group-hover:text-accent transition-colors">
                            {prop.propertyTitle}
                          </div>
                          <div className="text-[11px] text-muted">{prop.location?.location || prop.propertyType}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{prop.sellerId?.sellerName || 'N/A'}</td>
                        <td className="py-3 px-3 font-semibold text-primary">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(prop.price)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusBg}`}>
                            {prop.propertyStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!recentPropertiesData || recentPropertiesData.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted">No recent properties found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 40% (2 Cols): Property Breakdown & Recent Feed */}
        <div className="lg:col-span-2 space-y-5">
          {/* Notification History Feed (Moved Up) */}
          <div className="card p-5 bg-surface border border-border/80 rounded-2xl flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
              <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <AlertCircle size={15} className="text-accent" /> Notification History
              </h2>
              <Link to="/settings" className="text-xs text-accent font-medium hover:underline">View All</Link>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {!notifications || notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted/60 mt-8">
                  <CheckCircle2 size={30} className="mb-2 opacity-50" />
                  <span className="text-xs font-medium">No new notifications</span>
                </div>
              ) : (
                notifications.map((notif: any) => (
                  <Link
                    key={notif._id}
                    to={notif.url || '#'}
                    className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors border border-transparent ${notif.isRead ? 'hover:bg-surface-alt/60' : 'bg-surface-alt/60 border-accent/20 hover:bg-surface'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white border border-border/80 flex items-center justify-center p-1.5 shadow-sm mt-0.5 flex-shrink-0 relative">
                      <img src={notif.icon} alt="" className="w-full h-full object-contain" />
                      {!notif.isRead && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full border-2 border-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold truncate ${notif.isRead ? 'text-slate-600' : 'text-primary'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-muted flex-shrink-0">
                          {new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className={`text-[11px] truncate mt-0.5 ${notif.isRead ? 'text-slate-500' : 'text-slate-700'}`}>
                        {notif.body}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Property Distribution Card */}
          <div className="card p-5 bg-surface border border-border/80 rounded-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
              <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
                Property Distribution
              </h2>
              <span className="text-xs text-muted font-medium">By Category</span>
            </div>

            <div className="space-y-3.5">
              {propertyTypes.map((pt: any, i: number) => {
                const percent = Math.round((pt.count / totalProps) * 100);
                const barColors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500'];
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-primary">{pt.type}</span>
                      <span className="text-muted">{pt.count} properties ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColors[i % barColors.length]} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
