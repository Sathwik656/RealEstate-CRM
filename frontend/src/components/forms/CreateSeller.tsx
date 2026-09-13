import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

const schema = z.object({
  sellerName: z.string().min(1, 'Required'),
  contactNumber: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  note: z.string().optional(),
  referredByAgentId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;
interface Props { onSuccess: () => void; onCancel: () => void; initialData?: any; }

export function CreateSeller({ onSuccess, onCancel, initialData }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showReferral, setShowReferral] = useState(!!initialData?.referredByAgentId);
  const isEdit = !!initialData;

  const { data: agents } = useQuery({
    queryKey: ['agents-list'],
    queryFn: async () => (await api.get('/users/agents')).data.data,
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData ? {
      ...initialData,
      referredByAgentId: initialData.referredByAgentId?._id || initialData.referredByAgentId || '',
    } : {},
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      const payload: any = { ...data };
      if (!payload.referredByAgentId) delete payload.referredByAgentId;

      if (isEdit) {
        await api.put(`/sellers/${initialData._id}`, data);
      } else {
        await api.post('/sellers', data);
      }
      onSuccess();
    } catch (err: any) {
      setServerError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} seller`);
    }
  };

  return (
    <div className="page-wrapper max-w-3xl pb-24 mx-auto pt-6 px-4 sm:px-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{isEdit ? 'Edit Seller' : 'Add New Seller'}</h1>
          <p className="text-sm text-slate-500">{isEdit ? 'Update seller details' : 'Register a property owner or seller'}</p>
        </div>
      </div>
      
      {serverError && <div className="alert-error mb-6">{serverError}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Card 1: Basic Information */}
        <div className="form-card">
          <div className="p-5 sm:p-6">
            <h2 className="form-card-header">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="form-group md:col-span-2">
                <label className="form-label">Seller Name</label>
                <input {...register('sellerName')} className="form-input" placeholder="e.g. Alice Smith" />
                {errors.sellerName && <p className="form-error">{errors.sellerName.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input {...register('contactNumber')} className="form-input" placeholder="e.g. 9988776655" />
                {errors.contactNumber && <p className="form-error">{errors.contactNumber.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Email Address (Optional)</label>
                <input type="email" {...register('email')} className="form-input" placeholder="e.g. alice@example.com" />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Address</label>
                <textarea {...register('address')} rows={3} className="form-input min-h-[80px]" placeholder="e.g. Andheri West, Mumbai" />
                {errors.address && <p className="form-error">{errors.address.message}</p>}
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Note (Optional)</label>
                <textarea {...register('note')} rows={2} className="form-input min-h-[60px]" placeholder="Any specific notes about the seller..." />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Referral Details */}
        <div className="form-card">
          <div className="p-5 sm:p-6">
            <h2 className="form-card-header">Agent Referral</h2>
            {!showReferral ? (
              <button 
                type="button" 
                onClick={() => setShowReferral(true)} 
                className="w-full py-3 rounded-lg border-2 border-dashed border-slate-300 text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                + Add Agent Referral
              </button>
            ) : (
              <div className="form-group">
                <label className="form-label">Referred By</label>
                <select {...register('referredByAgentId')} className="form-select">
                  <option value="">Select Agent ▼</option>
                  {agents?.map((agent: any) => (
                    <option key={agent._id} value={agent._id}>{agent.name} ({agent.email})</option>
                  ))}
                </select>
                <p className="form-helper">Links this seller registration to an agent for commission or tracking.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar (Sticky Footer) */}
        <div className="sticky-action-bar">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Seller' : 'Save Seller')}
          </button>
        </div>
      </form>
    </div>
  );
}
