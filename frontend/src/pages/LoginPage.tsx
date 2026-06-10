import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', data);
      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(160deg, #1a1f2e 0%, #0d1117 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #f0cc6e)' }}
          >
            <TrendingUp size={18} className="text-primary" />
          </div>
          <span className="text-white font-display font-bold text-xl">Veenu Real Estate</span>
        </div>

        <div>
          <h1 className="text-4xl font-display font-bold text-white leading-tight mb-4">
            Manage your<br />
            <span style={{ color: '#c9a84c' }}>real estate</span><br />
            business smarter.
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-sm">
            A comprehensive CRM to track properties, sellers, buyers, tenants, and lease agreements — all in one place.
          </p>
        </div>

        <div className="flex gap-8">
          {[
            { label: 'Properties', value: '500+' },
            { label: 'Clients', value: '1.2K+' },
            { label: 'Deals Closed', value: '98%' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-display font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40 uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
              <TrendingUp size={16} className="text-accent" />
            </div>
            <span className="font-display font-bold text-xl text-primary">Veenu Real Estate</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-primary">Welcome back</h2>
            <p className="text-muted mt-1">Sign in to your CRM dashboard</p>
          </div>

          {error && (
            <div className="alert-error mb-6">{error}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                {...register('email')}
                type="email"
                className="form-input"
                placeholder="admin@example.com"
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="form-input pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
