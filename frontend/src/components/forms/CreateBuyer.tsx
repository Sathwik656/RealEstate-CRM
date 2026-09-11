import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';

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
    <div className="page-wrapper max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="btn-icon hover:text-primary hover:bg-surface-alt"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Buyer' : 'Add New Buyer'}</h1>
          <p className="page-subtitle">{isEdit ? 'Update buyer details' : 'Register a prospective property buyer'}</p>
        </div>
      </div>
      {serverError && <div className="alert-error">{serverError}</div>}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                <label className="form-label">Preferred Location</label>
                <input {...register('preferredLocation')} className="form-input" placeholder="e.g. Juhu" />
                {errors.preferredLocation && <p className="form-error">{errors.preferredLocation.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Purpose</label>
                <select {...register('purpose')} className="form-select">
                  <option value="Purchase">Purchase</option>
                  <option value="Rent">Rent</option>
                </select>
                {errors.purpose && <p className="form-error">{errors.purpose.message}</p>}
              </div>
              <Controller
                name="budgetMax"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id="budgetMax"
                    label="Max Budget (₹)"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.budgetMax?.message}
                  />
                )}
              />
              <div className="form-group">
                <label className="form-label">BHK Requirement</label>
                <input type="number" {...register('bhkRequirement')} className="form-input" />
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Note (Optional)</label>
                <textarea {...register('note')} rows={3} className="form-input resize-none" placeholder="Add a note" />
              </div>

              {!showReferral ? (
                <div className="md:col-span-2 pt-2">
                  <button type="button" onClick={() => setShowReferral(true)} className="btn-outline">
                    + Add Referral
                  </button>
                </div>
              ) : (
                <>
                  <hr className="border-border md:col-span-2" />
                  <h3 className="font-display font-semibold text-primary md:col-span-2">Agent Referral</h3>

                  <div className="form-group md:col-span-2">
                    <label className="form-label">Referred By</label>
                    <select {...register('referredByAgentId')} className="form-select">
                      <option value="">Select Agent ▼</option>
                      {agents?.map((agent: any) => (
                        <option key={agent._id} value={agent._id}>{agent.name} ({agent.email})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : (isEdit ? 'Update Buyer' : 'Save Buyer')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
