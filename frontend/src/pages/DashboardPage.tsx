import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Building2, Users, UserSquare2, TrendingUp, Handshake, ClipboardCheck } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

import { useAuth } from '@/context/AuthContext';

const COLORS = ['#1a1f2e', '#c9a84c', '#3b82f6', '#10b981', '#6366f1'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data.data;
    },
  });

  const { data: chartsData, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: async () => {
      const res = await api.get('/dashboard/charts');
      return res.data.data;
    },
  });

  if (statsLoading || chartsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted uppercase tracking-widest">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Properties',
      value: statsData?.totalProperties ?? 0,
      icon: Building2,
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      link: '/properties',
    },
    ...(user?.role === 'admin' ? [
      {
        title: 'Total Sellers',
        value: statsData?.totalSellers ?? 0,
        icon: Users,
        color: 'from-violet-500 to-violet-600',
        bg: 'bg-violet-50',
        link: '/sellers',
      },
      {
        title: 'Total Buyers',
        value: statsData?.totalBuyers ?? 0,
        icon: UserSquare2,
        color: 'from-emerald-500 to-emerald-600',
        bg: 'bg-emerald-50',
        link: '/buyers',
      },
      {
        title: 'Pending Approvals',
        value: statsData?.pendingApprovals ?? 0,
        icon: ClipboardCheck,
        color: 'from-amber-500 to-amber-600',
        bg: 'bg-amber-50',
        link: '/deal-approvals',
      },
      {
        title: 'Ongoing Deals',
        value: statsData?.ongoingDeals ?? 0,
        icon: Handshake,
        color: 'from-orange-500 to-orange-600',
        bg: 'bg-orange-50',
        link: '/deals',
      },
    ] : [
      {
        title: 'My Ongoing Deals',
        value: statsData?.ongoingDeals ?? 0,
        icon: Handshake,
        color: 'from-amber-500 to-amber-600',
        bg: 'bg-amber-50',
        link: '/deals',
      },
      {
        title: 'Pending Approval',
        value: statsData?.pendingApprovals ?? 0,
        icon: ClipboardCheck,
        color: 'from-orange-500 to-orange-600',
        bg: 'bg-orange-50',
        link: '/deals',
      },
    ]),
  ];

  return (
    <div className="page-wrapper">
      {/* Welcome Banner */}
      <div
        className="rounded-xl p-6 text-white flex items-center justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #252b3b 100%)' }}
      >
        <div className="relative z-10">
          <p className="text-white/60 text-sm font-medium uppercase tracking-wider">Welcome back</p>
          <h1 className="text-2xl font-display font-bold text-white mt-1">VERANDAH REALITY</h1>
          <p className="text-white/50 text-sm mt-1">Here&apos;s an overview of your business today.</p>
        </div>
        <TrendingUp size={80} className="text-white/5 absolute right-6 top-1/2 -translate-y-1/2" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((stat, i) => (
          <Link key={i} to={stat.link} className="stat-card hover:border-accent/50">
            <div>
              <p className="stat-label">{stat.title}</p>
              <p className="stat-value">{stat.value}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
                <TrendingUp size={12} />
                <span>All time</span>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <div className={`bg-gradient-to-br ${stat.color} w-8 h-8 rounded-lg flex items-center justify-center`}>
                <stat.icon size={16} className="text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
