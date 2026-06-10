import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Building2, Home, Users, UserSquare2, TrendingUp, TrendingDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#1a1f2e', '#c9a84c', '#3b82f6', '#10b981', '#6366f1'];

export default function DashboardPage() {
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
    },
    {
      title: 'Total Sellers',
      value: statsData?.totalSellers ?? 0,
      icon: Users,
      color: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50',
    },
    {
      title: 'Total Buyers',
      value: statsData?.totalBuyers ?? 0,
      icon: UserSquare2,
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Active Rentals',
      value: statsData?.totalRentals ?? 0,
      icon: Home,
      color: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50',
    },
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
          <h1 className="text-2xl font-display font-bold text-white mt-1">Veenu Real Estate CRM</h1>
          <p className="text-white/50 text-sm mt-1">Here&apos;s an overview of your business today.</p>
        </div>
        <TrendingUp size={80} className="text-white/5 absolute right-6 top-1/2 -translate-y-1/2" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((stat, i) => (
          <div key={i} className="stat-card">
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
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-primary">Properties by Status</h3>
          </div>
          <div className="card-body">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsData?.propertiesByStatus ?? []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e6ef" />
                  <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e6ef', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: '#f0f2f7' }}
                  />
                  <Bar dataKey="count" fill="#c9a84c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-primary">Buyers by Budget (₹ Cr)</h3>
          </div>
          <div className="card-body">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartsData?.buyersByBudget ?? []}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="range"
                  >
                    {(chartsData?.buyersByBudget ?? []).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e6ef' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
