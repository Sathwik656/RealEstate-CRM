import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';

const schema = z.object({
  propertyRef: z.string().min(1, 'Required'),
  location: z.string().min(1, 'Required'),
  rentAmount: z.preprocess(Number, z.number().min(0)),
  securityDeposit: z.preprocess(Number, z.number().min(0)),
  furnishing: z.string().min(1, 'Required'),
  bhk: z.preprocess(Number, z.number().min(1)),
});
type FormValues = z.infer<typeof schema>;
interface Props { onSuccess: () => void; onCancel: () => void; initialData?: any; }

export function CreateRental({ onSuccess, onCancel, initialData }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!initialData;
  const { data: properties } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => (await api.get('/properties?limit=1000')).data.data,
  });
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData ? {
      ...initialData,
      propertyRef: initialData.propertyRef?._id || initialData.propertyRef,
    } : {},
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      if (isEdit) {
        await api.put(`/rentals/${initialData._id}`, data);
      } else {
        await api.post('/rentals', data);
      }
      onSuccess();
    } catch (err: any) {
      setServerError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} rental`);
    }
  };

  return (
    <div className="page-wrapper max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="btn-icon hover:text-primary hover:bg-surface-alt"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Rental Property' : 'Add Rental Property'}</h1>
          <p className="page-subtitle">{isEdit ? 'Update rental details' : 'Create a new rental listing'}</p>
        </div>
      </div>
      {serverError && <div className="alert-error">{serverError}</div>}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="form-group md:col-span-2">
                <label className="form-label">Link Property</label>
                <select {...register('propertyRef')} className="form-select">
                  <option value="">-- Select Property --</option>
                  {properties?.map((p: any) => (
                    <option key={p._id} value={p._id}>{p.propertyTitle} ({p.propertyId})</option>
                  ))}
                </select>
                {errors.propertyRef && <p className="form-error">{errors.propertyRef.message}</p>}
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Location</label>
                <input {...register('location')} className="form-input" placeholder="e.g. Powai, Mumbai" />
                {errors.location && <p className="form-error">{errors.location.message}</p>}
              </div>
              <Controller
                name="rentAmount"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id="rentAmount"
                    label="Rent Amount (₹/month)"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              <Controller
                name="securityDeposit"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id="securityDeposit"
                    label="Security Deposit (₹)"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              <div className="form-group">
                <label className="form-label">BHK</label>
                <input type="number" {...register('bhk')} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Furnishing</label>
                <select {...register('furnishing')} className="form-select">
                  <option value="">Select</option>
                  <option>Furnished</option>
                  <option>Semi-Furnished</option>
                  <option>Unfurnished</option>
                </select>
                {errors.furnishing && <p className="form-error">{errors.furnishing.message}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : (isEdit ? 'Update Rental' : 'Save Rental')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
