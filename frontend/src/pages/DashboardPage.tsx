import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { DesktopDashboard } from './DesktopDashboard';
import { MobileDashboard } from './MobileDashboard';

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

  const { data: recentPropertiesData, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-properties'],
    queryFn: async () => {
      const res = await api.get('/properties', { params: { limit: 5 } });
      return res.data.data;
    },
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications?limit=5');
      return res.data.data.notifications || [];
    },
    refetchInterval: 30000,
  });

  if (statsLoading || chartsLoading || recentLoading || notificationsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted font-medium">Loading Verandah Dashboard...</span>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <>
      <div className="hidden lg:block">
        <DesktopDashboard 
          statsData={statsData}
          chartsData={chartsData}
          recentPropertiesData={recentPropertiesData}
          notifications={notifications}
          isAdmin={isAdmin}
        />
      </div>
      <div className="block lg:hidden">
        <MobileDashboard 
          statsData={statsData}
          recentPropertiesData={recentPropertiesData}
          isAdmin={isAdmin}
          user={user}
        />
      </div>
    </>
  );
}
