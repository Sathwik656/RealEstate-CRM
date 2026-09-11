import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

// Pages
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import PropertiesPage from '@/pages/PropertiesPage';
import PropertyViewPage from '@/pages/PropertyViewPage';
import SellersPage from '@/pages/SellersPage';
import BuyersPage from '@/pages/BuyersPage';
import SearchPage from '@/pages/SearchPage';
import AgentsPage from '@/pages/AgentsPage';
import AgentDetailsPage from '@/pages/AgentDetailsPage';
import SettingsPage from '@/pages/SettingsPage';
import DealsPage from '@/pages/DealsPage';
import DealApprovalsPage from '@/pages/DealApprovalsPage';
import ReportsPage from '@/pages/ReportsPage';
import AllotmentsPage from '@/pages/AllotmentsPage';

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="properties" element={<PropertiesPage />} />
              <Route path="properties/:propertyCode" element={<PropertyViewPage />} />
              <Route path="sellers" element={<ProtectedRoute><SellersPage /></ProtectedRoute>} />
              <Route path="buyers" element={<ProtectedRoute><BuyersPage /></ProtectedRoute>} />
              <Route path="agents" element={<ProtectedRoute requireAdmin><AgentsPage /></ProtectedRoute>} />
              <Route path="agents/:id" element={<ProtectedRoute requireAdmin><AgentDetailsPage /></ProtectedRoute>} />
              <Route path="search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="deals" element={<ProtectedRoute><DealsPage /></ProtectedRoute>} />
              <Route path="allotments" element={<ProtectedRoute requireAdmin><AllotmentsPage /></ProtectedRoute>} />
              <Route path="deal-approvals" element={<ProtectedRoute requireAdmin><DealApprovalsPage /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
