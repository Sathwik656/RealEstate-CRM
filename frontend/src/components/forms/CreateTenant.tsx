import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';

const schema = z.object({
  tenantName: z.string().min(1, 'Required'),
  contactNumber: z.string().min(10, 'Min 10 digits'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  preferredLocation: z.string().min(1, 'Required'),
  budgetRange: z.preprocess(Number, z.number().min(0)),
  bhkRequirement: z.preprocess(Number, z.number().min(1)),
});
type FormValues = z.infer<typeof schema>;
interface Props { onSuccess: () => void; onCancel: () => void; initialData?: any; }

export function CreateTenant({ onSuccess, onCancel, initialData }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!initialData;
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData || {},
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      if (isEdit) {
        await api.put(`/tenants/${initialData._id}`, data);
      } else {
        await api.post('/tenants', data);
      }
      onSuccess();
    } catch (err: any) {
      setServerError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} tenant`);
    }
  };

  return (
    <div className="page-wrapper max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="btn-icon hover:text-primary hover:bg-surface-alt"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Tenant' : 'Add New Tenant'}</h1>
          <p className="page-subtitle">{isEdit ? 'Update tenant details' : 'Register a prospective tenant'}</p>
        </div>
      </div>
      {serverError && <div className="alert-error">{serverError}</div>}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="form-group md:col-span-2">
                <label className="form-label">Tenant Name</label>
                <input {...register('tenantName')} className="form-input" placeholder="e.g. Charlie Brown" />
                {errors.tenantName && <p className="form-error">{errors.tenantName.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input {...register('contactNumber')} className="form-input" placeholder="e.g. 9888777666" />
                {errors.contactNumber && <p className="form-error">{errors.contactNumber.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input {...register('email')} className="form-input" placeholder="e.g. charlie@example.com" />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Preferred Location</label>
                <input {...register('preferredLocation')} className="form-input" placeholder="e.g. Powai" />
                {errors.preferredLocation && <p className="form-error">{errors.preferredLocation.message}</p>}
              </div>
              <Controller
                name="budgetRange"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id="budgetRange"
                    label="Budget Max (₹)"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.budgetRange?.message}
                  />
                )}
              />
              <div className="form-group">
                <label className="form-label">BHK Requirement</label>
                <input type="number" {...register('bhkRequirement')} className="form-input" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : (isEdit ? 'Update Tenant' : 'Save Tenant')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
