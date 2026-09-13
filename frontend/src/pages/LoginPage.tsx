import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { TrendingUp, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const authSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'agent']).optional().default('agent'),
});

type AuthForm = z.infer<typeof authSchema>;

export default function LoginPage() {
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  
  // OTP State
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Timers
  const [expiresIn, setExpiresIn] = useState(300); // 5 mins
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp') {
      timer = setInterval(() => {
        setExpiresIn(prev => (prev > 0 ? prev - 1 : 0));
        setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step]);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: { role: 'agent', name: '' }
  });

  const onSubmit = async (data: AuthForm) => {
    try {
      setError(null);
      setSuccessMsg(null);

      if (!isLogin && (!data.name || data.name.trim() === '')) {
        setError('Name is required for registration');
        return;
      }

      if (isLogin) {
        const response = await api.post('/auth/login', {
          email: data.email,
          password: data.password,
        });
        
        if (response.data.success && response.data.requiresOtp) {
          setVerificationId(response.data.verificationId);
          setLoginEmail(data.email);
          setStep('otp');
          setExpiresIn(300);
          setResendCooldown(30);
          setSuccessMsg(response.data.message || 'OTP sent to your email.');
        } else if (response.data.success && response.data.data?.token) {
          // Fallback if OTP is ever disabled
          login(response.data.data.token, response.data.data.user);
        }
      } else {
        const response = await api.post('/auth/register', {
          name: data.name,
          email: data.email,
          password: data.password,
          role: 'agent',
        });
        if (response.data.success) {
          setSuccessMsg('Registration successful! You can now sign in.');
          setIsLogin(true);
          reset({ ...data, password: '' });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || `${isLogin ? 'Login' : 'Registration'} failed. Please try again.`);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    try {
      setError(null);
      setSuccessMsg(null);
      setIsVerifying(true);
      const response = await api.post('/auth/verify-login-otp', {
        verificationId,
        otp
      });
      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      setError(null);
      setSuccessMsg(null);
      const response = await api.post('/auth/resend-login-otp', { verificationId });
      if (response.data.success) {
        setVerificationId(response.data.verificationId);
        setExpiresIn(300);
        setResendCooldown(30);
        setSuccessMsg(response.data.message || 'A new verification code has been sent.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(160deg, #1a1f2e 0%, #0d1117 100%)' }}
      >
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Veenu Real Estate" className="h-10 w-auto object-contain" />
          <span className="text-white font-display font-bold text-xl tracking-wide">THE VERANDAH</span>
        </div>

        <div>
          <h1 className="text-4xl font-display font-bold text-white leading-tight mb-4">
            Manage your<br />
            <span style={{ color: '#c9a84c' }}>real estate</span><br />
            business smarter.
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-sm">
            A comprehensive CRM to track properties, sellers, and buyers — all in one place.
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
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <img src="/logo.png" alt="Veenu Real Estate" className="h-12 w-auto object-contain" />
            <span className="font-display font-bold text-2xl text-primary tracking-wide">THE VERANDAH</span>
          </div>

          {step === 'login' ? (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-primary">
                  {isLogin ? 'Welcome back' : 'Create an account'}
                </h2>
                <p className="text-muted mt-1">
                  {isLogin ? 'Sign in to your CRM dashboard' : 'Register as a new user in the CRM'}
                </p>
              </div>

              {error && <div className="alert-error mb-6">{error}</div>}
              {successMsg && <div className="p-4 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100 mb-6">{successMsg}</div>}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {!isLogin && (
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      {...register('name')}
                      type="text"
                      className="form-input"
                      placeholder="John Doe"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    {...register('email')}
                    type="email"
                    className="form-input"
                    placeholder="user@example.com"
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
                      {isLogin ? 'Signing in...' : 'Registering...'}
                    </span>
                  ) : (
                    isLogin ? 'Sign In' : 'Sign Up'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-muted">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button 
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError(null);
                      setSuccessMsg(null);
                    }} 
                    className="text-accent font-semibold hover:underline"
                  >
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </>
          ) : (
            // OTP Screen
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => { setStep('login'); setError(null); setSuccessMsg(null); }}
                className="flex items-center gap-2 text-sm text-muted hover:text-primary mb-6 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to login
              </button>

              <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-primary">
                  Verify Your Email
                </h2>
                <p className="text-muted mt-2">
                  We've sent a 6-digit verification code<br/>to <span className="font-semibold text-primary">{loginEmail}</span>.
                </p>
              </div>

              {error && <div className="alert-error mb-6">{error}</div>}
              {successMsg && <div className="p-4 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100 mb-6">{successMsg}</div>}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="form-group">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="form-input text-center text-3xl tracking-[0.5em] font-mono py-4 font-bold text-primary"
                    placeholder="------"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isVerifying || otp.length !== 6} 
                  className="btn-primary w-full py-3"
                >
                  {isVerifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify OTP'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center space-y-4">
                <p className="text-sm text-muted">
                  Didn't receive the code?
                </p>
                <button 
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className={`text-sm font-semibold transition-colors ${resendCooldown > 0 ? 'text-muted cursor-not-allowed' : 'text-accent hover:underline'}`}
                >
                  {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend OTP'}
                </button>
                
                {expiresIn > 0 ? (
                  <p className="text-xs text-muted font-mono mt-4">
                    Code expires in {formatTime(expiresIn)}
                  </p>
                ) : (
                  <p className="text-xs text-red-500 font-mono mt-4">
                    Code has expired
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
