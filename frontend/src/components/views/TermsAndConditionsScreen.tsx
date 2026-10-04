import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Check, ShieldCheck, ChevronRight } from 'lucide-react';
import api from '@/lib/api';

export function TermsAndConditionsScreen() {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);
  const { updateUser } = useAuth();

  const handleAccept = async () => {
    if (!checked) {
      setError('Please agree to the terms to continue');
      return;
    }
    
    setIsAccepting(true);
    setError('');
    
    try {
      const response = await api.post('/auth/accept-terms');
      if (response.data.success) {
        updateUser(response.data.data.user);
      } else {
        setError(response.data.message || 'Something went wrong');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept terms');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-6 py-8 sm:px-10 border-b border-slate-100 bg-white sticky top-0 z-10 text-center">
            <div className="mx-auto w-16 h-16 bg-accent/10 flex items-center justify-center rounded-2xl mb-4">
              <ShieldCheck className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Terms & Conditions</h2>
            <p className="mt-2 text-sm text-slate-500">
              Please read and accept our terms to continue using Veranda CRM
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-8 sm:px-10 overflow-y-auto bg-slate-50/50 flex-1">
            <div className="prose prose-slate prose-sm sm:prose-base max-w-none text-slate-600">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">1. Admin Access and Authority</h3>
              <p className="mb-6">The Admin has full access and authority over all transactions, records, and changes made within the system.</p>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">2. Management of Information</h3>
              <p className="mb-6">Any property details, values, or other information created or submitted by you may be reviewed, managed, or modified by the Admin when required.</p>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">3. Responsible Property Interest</h3>
              <p className="mb-6">Only mark a property as <strong>Interested</strong> if you are genuinely interested and reasonably confident that you can proceed with the deal. Avoid marking properties as Interested without a genuine intention to continue the process.</p>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">4. Responsible Use of the System</h3>
              <p className="mb-6">All actions and transactions performed by you within the system may be recorded and visible to the Admin as activity logs. Please ensure that you use the system responsibly and carefully before taking any action.</p>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">5. Accuracy and Accountability</h3>
              <p className="mb-0">By using the system, you are responsible for the actions and information you submit. Repeated or unnecessary actions may be reviewed by the Admin.</p>
            </div>
          </div>

          {/* Footer / Actions */}
          <div className="px-6 py-6 sm:px-10 border-t border-slate-100 bg-white sticky bottom-0 z-10">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
            
            <label className="flex items-start gap-3 cursor-pointer group mb-6">
              <div className="relative flex items-center justify-center mt-0.5">
                <input 
                  type="checkbox"
                  className="peer sr-only"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-accent peer-checked:border-accent transition-all group-hover:border-accent/50" />
                <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
              <span className="text-sm font-medium text-slate-700 select-none group-hover:text-slate-900 transition-colors">
                I have read and agree to the Terms & Conditions
              </span>
            </label>

            <button
              onClick={handleAccept}
              disabled={!checked || isAccepting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-medium bg-slate-900 hover:bg-slate-800 focus:ring-4 focus:ring-slate-900/10 transition-all disabled:opacity-50 disabled:hover:bg-slate-900 hover:-translate-y-0.5 disabled:hover:translate-y-0 shadow-sm"
            >
              {isAccepting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Accept & Continue</span>
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
