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
      value: statsData?.totalProperties ?? 14,
      icon: Building2,
      iconBg: 'bg-indigo-50/80 border-indigo-100 text-indigo-600',
      sparklineColor: '#6366F1',
      trend: '+4 this week',
      trendType: 'positive',
      link: '/properties',
    },
    {
      title: 'Total Sellers',
      value: statsData?.totalSellers ?? 6,
      icon: Tag,
      iconBg: 'bg-violet-50/80 border-violet-100 text-violet-600',
      sparklineColor: '#8B5CF6',
      trend: 'Verified partners',
      trendType: 'neutral',
      link: '/sellers',
    },
    {
      title: 'Total Buyers',
      value: statsData?.totalBuyers ?? 38,
      icon: Users,
      iconBg: 'bg-emerald-50/80 border-emerald-100 text-emerald-600',
      sparklineColor: '#10B981',
      trend: '+12% vs last mo.',
      trendType: 'positive',
      link: '/buyers',
    },
    ...(isAdmin ? [{
      title: 'Pending Approvals',
      value: statsData?.pendingApprovals ?? 0,
      icon: Clock,
      iconBg: 'bg-amber-50/80 border-amber-100 text-amber-600',
      sparklineColor: '#F59E0B',
      trend: (statsData?.pendingApprovals ?? 0) > 0 ? 'Requires action' : 'All caught up',
      trendType: (statsData?.pendingApprovals ?? 0) > 0 ? 'warning' : 'neutral',
      link: '/deal-approvals',
    }] : []),
    isAdmin
      ? {
          title: 'Allotment Requests',
          value: statsData?.allotmentRequests ?? 0,
          icon: Handshake,
          iconBg: 'bg-orange-50/80 border-orange-100 text-orange-600',
          sparklineColor: '#F97316',
          trend: (statsData?.allotmentRequests ?? 0) > 0 ? 'Requires review' : 'No pending requests',
          trendType: (statsData?.allotmentRequests ?? 0) > 0 ? 'warning' : 'neutral',
          link: '/allotments',
        }
      : {
          title: 'Ongoing Deals',
          value: statsData?.ongoingDeals ?? 0,
          icon: Handshake,
          iconBg: 'bg-orange-50/80 border-orange-100 text-orange-600',
          sparklineColor: '#F97316',
          trend: 'Active pipeline',
          trendType: 'positive',
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
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent/10 text-accent border border-accent/20">
              PRO CRM
            </span>
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

      {/* 2. 5 Core KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              to={kpi.link}
              className="card p-4 hover:border-slate-300 hover:shadow-md transition-all duration-200 group flex flex-col justify-between rounded-2xl bg-surface border border-border/80"
            >
              {/* Header: Icon Capsule & Sparkline */}
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${kpi.iconBg} transition-transform group-hover:scale-105`}>
                  <Icon size={18} />
                </div>
                <Sparkline color={kpi.sparklineColor} />
              </div>

              {/* Metric Title & Value */}
              <div>
                <p className="text-xs font-medium text-muted tracking-tight">{kpi.title}</p>
                <div className="flex items-baseline justify-between mt-1">
                  <p className="text-2xl font-display font-bold text-primary">{kpi.value}</p>
                </div>
              </div>

              {/* Footer: Trend Tag */}
              <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                <span
                  className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    kpi.trendType === 'positive'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : kpi.trendType === 'warning'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {kpi.trend}
                </span>
                <ArrowUpRight size={13} className="text-muted/60 group-hover:text-primary transition-colors" />
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
