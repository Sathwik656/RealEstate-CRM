import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { TermsAndConditionsScreen } from '@/components/views/TermsAndConditionsScreen';

export function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-muted tracking-widest uppercase animate-pulse">
            Loading Veranda Realty...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role === 'agent') {
    return <Navigate to="/dashboard" replace />;
  }

  // Show T&C if not accepted yet
  if (user.termsAccepted === false) {
    return <TermsAndConditionsScreen />;
  }

  return <>{children}</>;
}
