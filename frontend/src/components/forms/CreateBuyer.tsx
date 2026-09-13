import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';
import { SegmentedControl } from '../ui/FormControls';

const schema = z.object({
  buyerName: z.string().min(1, 'Required'),
  contactNumber: z.string().min(10, 'Min 10 digits'),
  preferredLocation: z.string().min(1, 'Required'),
  purpose: z.enum(['Purchase', 'Rent']),
  budgetMax: z.preprocess(Number, z.number().min(0)),
  bhkRequirement: z.preprocess(Number, z.number().min(1)),
  status: z.enum(['Active', 'Closed']),
  note: z.string().optional(),
  referredByAgentId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
interface Props { onSuccess: () => void; onCancel: () => void; initialData?: any; }

export function CreateBuyer({ onSuccess, onCancel, initialData }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showReferral, setShowReferral] = useState(!!initialData?.referredByAgentId);
  const isEdit = !!initialData;

  const { data: agents } = useQuery({
    queryKey: ['agents-list'],
    queryFn: async () => (await api.get('/users/agents')).data.data,
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData ? { 
      ...initialData,
      referredByAgentId: initialData.referredByAgentId?._id || initialData.referredByAgentId || '',
    } : { status: 'Active', purpose: 'Purchase' },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      const payload: any = { ...data };
      if (!payload.referredByAgentId) delete payload.referredByAgentId;

      if (isEdit) {
        await api.put(`/buyers/${initialData._id}`, payload);
      } else {
        await api.post('/buyers', payload);
      }

      onSuccess();
    } catch (err: any) {
      setServerError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} buyer`);
    }
  };

  return (
    <div className="page-wrapper max-w-3xl pb-24 mx-auto pt-6 px-4 sm:px-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{isEdit ? 'Edit Buyer' : 'Add New Buyer'}</h1>
          <p className="text-sm text-slate-500">{isEdit ? 'Update buyer details' : 'Register a prospective property buyer'}</p>
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
                <label className="form-label">Buyer Name</label>
                <input {...register('buyerName')} className="form-input" placeholder="e.g. Bob Williams" />
                {errors.buyerName && <p className="form-error">{errors.buyerName.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input {...register('contactNumber')} className="form-input" placeholder="e.g. 9123456780" />
                {errors.contactNumber && <p className="form-error">{errors.contactNumber.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label mb-2">Purpose</label>
                <Controller
                  name="purpose"
                  control={control}
                  render={({ field }) => (
                    <SegmentedControl
                      options={[
                        { label: 'Purchase', value: 'Purchase' },
                        { label: 'Rent', value: 'Rent' },
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.purpose && <p className="form-error">{errors.purpose.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Property Requirements */}
        <div className="form-card">
          <div className="p-5 sm:p-6">
            <h2 className="form-card-header">Property Requirements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="form-group md:col-span-2">
                <label className="form-label">Preferred Location</label>
                <input {...register('preferredLocation')} className="form-input" placeholder="e.g. Juhu" />
                {errors.preferredLocation && <p className="form-error">{errors.preferredLocation.message}</p>}
              </div>
              
              <Controller
                name="budgetMax"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id="budgetMax"
                    label="Max Budget"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.budgetMax?.message}
                  />
                )}
              />
              <div className="form-group">
                <label className="form-label">BHK Requirement</label>
                <input type="number" {...register('bhkRequirement')} className="form-input" placeholder="e.g. 3" />
                {errors.bhkRequirement && <p className="form-error">{errors.bhkRequirement.message}</p>}
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Note (Optional)</label>
                <textarea {...register('note')} rows={3} className="form-input min-h-[80px]" placeholder="Add a note about specific requirements" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Referral Details */}
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
                <p className="form-helper">Links this buyer registration to an agent for commission or tracking.</p>
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
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Buyer' : 'Save Buyer')}
          </button>
        </div>
      </form>
    </div>
  );
}
