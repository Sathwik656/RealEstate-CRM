import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';

const authSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'agent']).optional().default('agent'),
});

type AuthForm = z.infer<typeof authSchema>;

function OtpInputBoxes({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newOtpArr = value.padEnd(6, ' ').split('');
    newOtpArr[index] = digit || '';
    const newOtp = newOtpArr.join('').trimEnd();
    onChange(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="flex gap-2.5 justify-center items-center my-6">
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => { inputRefs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[idx] || ''}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className={clsx(
            "w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-slate-900",
            value[idx]
              ? "bg-white border-slate-900 text-slate-900 shadow-sm"
              : "bg-slate-50 border-slate-200 text-slate-900"
          )}
        />
      ))}
    </div>
  );
}

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
          setOtp('');
          setExpiresIn(300);
          setResendCooldown(30);
          setSuccessMsg(response.data.message || 'OTP sent to your email.');
        } else if (response.data.success && response.data.data?.token) {
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
        setOtp('');
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
    <div className="min-h-screen flex bg-background font-sans">
      {/* Left Panel - Desktop Only */}
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

      {/* Right Panel - Desktop & Mobile */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 overflow-y-auto bg-[#f8fafc] lg:bg-background">
        <div className="w-full max-w-md py-6 sm:py-8">
          {/* Mobile Header / Branding */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img src="/logo.png" alt="Veenu Real Estate" className="h-10 w-auto object-contain" />
            <span className="font-display font-bold text-xl text-slate-900 tracking-wide">THE VERANDAH</span>
          </div>

          {step === 'login' ? (
            <>
              <div className="mb-8 text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {isLogin ? 'Welcome back' : 'Create an account'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {isLogin ? 'Sign in to your CRM dashboard' : 'Register as a new user in the CRM'}
                </p>
              </div>

              {error && (
                <div className="p-3.5 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 mb-6 font-medium">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100 mb-6 font-medium">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
                {!isLogin && (
                  <div className="form-group">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 block">Full Name</label>
                    <input
                      {...register('name')}
                      type="text"
                      className="w-full px-4 py-3 bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 block">Email Address</label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-3 bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all outline-none"
                    placeholder="user@example.com"
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>}
                </div>

                <div className="form-group">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 block">Password</label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="w-full px-4 py-3 bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all outline-none pr-11"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</p>}
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 mt-2"
                >
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
                <p className="text-xs sm:text-sm text-slate-500">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button 
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError(null);
                      setSuccessMsg(null);
                    }} 
                    className="text-[#c9a84c] font-semibold hover:underline ml-0.5"
                  >
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </>
          ) : (
            /* OTP Screen */
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => { setStep('login'); setError(null); setSuccessMsg(null); }}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to login
              </button>

              <div className="mb-6 text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Verify your email
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Enter the OTP sent to<br/>
                  <span className="font-semibold text-slate-900">{loginEmail}</span>
                </p>
              </div>

              {error && (
                <div className="p-3.5 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 mb-6 font-medium">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100 mb-6 font-medium">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <OtpInputBoxes value={otp} onChange={setOtp} />

                <button 
                  type="submit" 
                  disabled={isVerifying || otp.length !== 6} 
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
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

              <div className="mt-8 text-center space-y-3">
                <p className="text-xs sm:text-sm text-slate-500">
                  Didn't receive the code?
                </p>
                
                <div>
                  <button 
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className={clsx(
                      "text-xs sm:text-sm font-semibold transition-colors",
                      resendCooldown > 0 ? "text-slate-400 cursor-not-allowed" : "text-[#c9a84c] hover:underline"
                    )}
                  >
                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
                
                {expiresIn > 0 ? (
                  <p className="text-xs text-slate-400 font-mono pt-2">
                    OTP expires in {formatTime(expiresIn)}
                  </p>
                ) : (
                  <p className="text-xs text-red-500 font-mono pt-2">
                    OTP has expired
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
