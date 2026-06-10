import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

const schema = z.object({
  buyerName: z.string().min(1, 'Required'),
  contactNumber: z.string().min(10, 'Min 10 digits'),
  preferredLocation: z.string().min(1, 'Required'),
  budgetMax: z.preprocess(Number, z.number().min(0)),
  bhkRequirement: z.preprocess(Number, z.number().min(1)),
  followUpDate: z.string().min(1, 'Required'),
});
type FormValues = z.infer<typeof schema>;
interface Props { onSuccess: () => void; onCancel: () => void; }

export function CreateBuyer({ onSuccess, onCancel }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      await api.post('/buyers', data);
      onSuccess();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to create buyer');
    }
  };

  return (
    <div className="page-wrapper max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="btn-icon hover:text-primary hover:bg-surface-alt"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="page-title">Add New Buyer</h1>
          <p className="page-subtitle">Register a prospective property buyer</p>
        </div>
      </div>
      {serverError && <div className="alert-error">{serverError}</div>}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
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
                <label className="form-label">Max Budget (₹)</label>
                <input type="number" {...register('budgetMax')} className="form-input" />
                {errors.budgetMax && <p className="form-error">{errors.budgetMax.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">BHK Requirement</label>
                <input type="number" {...register('bhkRequirement')} className="form-input" />
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Follow-Up Date</label>
                <input type="date" {...register('followUpDate')} className="form-input" />
                {errors.followUpDate && <p className="form-error">{errors.followUpDate.message}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : 'Save Buyer'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
