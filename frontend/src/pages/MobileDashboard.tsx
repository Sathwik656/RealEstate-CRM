import { Link } from 'react-router-dom';
import { Building2, Users, Tag, Handshake, Clock, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';
import { NotificationDropdown } from '@/components/layout/NotificationDropdown';

export function MobileDashboard({ statsData, recentPropertiesData, isAdmin, user }: any) {
  return (
    <div className="w-full pb-6 font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <div>
          <p className="text-xs text-slate-500 font-medium">Welcome back!</p>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{user?.name || 'Sathwik'}</h1>
        </div>
        <NotificationDropdown 
          triggerClassName="relative p-2.5 rounded-full bg-white shadow-sm border border-slate-100/80 active:scale-95 transition-all flex items-center justify-center"
          iconSize={20}
        />
      </div>

      {/* Hero Card */}
      <div className="mx-4 mt-2 bg-[#1E2532] text-white rounded-2xl p-5 relative overflow-hidden shadow-sm">
        {/* Subtle background decoration */}
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-xl" />
        
        <div className="flex justify-between items-start">
          <p className="text-xs font-medium text-slate-300 opacity-90">Total Active Properties</p>
          <Link to="/properties" className="text-[10px] font-medium text-slate-400 hover:text-white transition-colors">
            View all &gt;
          </Link>
        </div>
        <p className="text-3xl font-bold mt-1 tracking-tight">{statsData?.totalProperties ?? 16}</p>
      </div>

      {/* KPI Grid (2x2) */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        {/* Card 1: Sellers */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100/60">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 bg-violet-50 text-violet-600 rounded-lg">
              <Tag size={16} />
            </div>
            <ArrowUpRight size={14} className="text-emerald-500" />
          </div>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Total Sellers</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{statsData?.totalSellers ?? 0}</p>
        </div>

        {/* Card 2: Buyers */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100/60">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Users size={16} />
            </div>
            <ArrowUpRight size={14} className="text-emerald-500" />
          </div>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Total Buyers</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{statsData?.totalBuyers ?? 0}</p>
        </div>

        {/* Card 3: Deals / Allotments */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100/60">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
              <Handshake size={16} />
            </div>
            <ArrowUpRight size={14} className="text-emerald-500" />
          </div>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
            {isAdmin ? 'Allotment Requests' : 'Ongoing Deals'}
          </p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">
            {isAdmin ? (statsData?.allotmentRequests ?? 0) : (statsData?.ongoingDeals ?? 0)}
          </p>
        </div>

        {/* Card 4: Approvals */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100/60">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Pending Approvals</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{statsData?.pendingApprovals ?? 0}</p>
        </div>
      </div>

      {/* Recently Added List */}
      <h2 className="text-lg font-bold text-slate-900 px-4 mt-7 mb-3 tracking-tight">Recently Added</h2>
      
      <div className="px-4 space-y-3">
        {recentPropertiesData?.map((prop: any) => {
          let badgeColor = 'bg-slate-100 text-slate-600';
          if (prop.propertyStatus === 'Available') badgeColor = 'bg-[#E7F7ED] text-[#137A3B]';
          if (prop.propertyStatus === 'Sold') badgeColor = 'bg-[#FEE2E2] text-[#B91C1C]';
          if (prop.propertyStatus === 'In Allotment') badgeColor = 'bg-[#E0E7FF] text-[#4338CA]';
          if (prop.propertyStatus === 'In Deal') badgeColor = 'bg-[#FEF3C7] text-[#B45309]';

          return (
            <Link 
              key={prop._id} 
              to={`/properties/${prop.code}`}
              className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100/50"
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 flex-shrink-0 bg-slate-100 rounded-[14px] flex items-center justify-center">
                <Building2 size={20} className="text-slate-400" />
              </div>
              
              {/* Details */}
              <div className="flex-1 min-w-0 py-0.5">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{prop.propertyTitle}</h3>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{prop.location?.location || prop.propertyType}</p>
              </div>

              {/* Price & Status */}
              <div className="text-right flex-shrink-0 flex flex-col items-end justify-center py-0.5">
                <p className="text-sm font-bold text-slate-900">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(prop.price)}
                </p>
                <span className={clsx('mt-1 px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide', badgeColor)}>
                  {prop.propertyStatus}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
