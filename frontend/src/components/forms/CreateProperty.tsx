import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';

const schema = z.object({
  propertyType: z.string().min(1, 'Required'),
  propertyTitle: z.string().min(1, 'Required'),
  purpose: z.string().min(1, 'Required'),
  price: z.preprocess(Number, z.number().min(0)),
  area: z.preprocess(Number, z.number().min(0)),
  bhk: z.preprocess(Number, z.number().min(0)),
  location: z.string().min(1, 'Required'),
  parkingAvailable: z.boolean().default(false),
  sellerId: z.string().optional(),
  ownerName: z.string().optional(),
  contactNumber: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props { onSuccess: () => void; onCancel: () => void; initialData?: any; }

export function CreateProperty({ onSuccess, onCancel, initialData }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!initialData;

  const { data: sellers } = useQuery({
    queryKey: ['sellers-list'],
    queryFn: async () => (await api.get('/sellers?limit=1000')).data.data,
  });

  const { register, handleSubmit, watch, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData || { parkingAvailable: false, sellerId: '' },
  });

  const selectedSeller = watch('sellerId');

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      const payload: any = { ...data };
      if (!payload.sellerId) delete payload.sellerId;
      
      if (isEdit) {
        await api.put(`/properties/${initialData._id}`, payload);
      } else {
        await api.post('/properties', payload);
      }
      onSuccess();
    } catch (err: any) {
      setServerError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} property`);
    }
  };

  return (
    <div className="page-wrapper max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="btn-icon hover:text-primary hover:bg-surface-alt"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Property' : 'Add New Property'}</h1>
          <p className="page-subtitle">{isEdit ? 'Update existing property details' : 'Create a new listing in the CRM'}</p>
        </div>
      </div>

      {serverError && <div className="alert-error">{serverError}</div>}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div className="form-group md:col-span-2">
                <label className="form-label">Property Title</label>
                <input {...register('propertyTitle')} className="form-input" placeholder="e.g. Luxury 3BHK in Bandra" />
                {errors.propertyTitle && <p className="form-error">{errors.propertyTitle.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Property Type</label>
                <select {...register('propertyType')} className="form-select">
                  <option value="">Select Type</option>
                  <option>Apartment/Flat</option>
                  <option>Independent House</option>
                  <option>Commercial Property</option>
                  <option>Land</option>
                  <option>Rental Property</option>
                </select>
                {errors.propertyType && <p className="form-error">{errors.propertyType.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Purpose</label>
                <select {...register('purpose')} className="form-select">
                  <option value="">Select Purpose</option>
                  <option>Sale</option>
                  <option>Rent</option>
                  <option>Lease</option>
                </select>
                {errors.purpose && <p className="form-error">{errors.purpose.message}</p>}
              </div>

              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id="price"
                    label="Price (₹)"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.price?.message}
                  />
                )}
              />

              <div className="form-group">
                <label className="form-label">Area (sq ft)</label>
                <input type="number" {...register('area')} className="form-input" />
              </div>

              <div className="form-group">
                <label className="form-label">BHK</label>
                <input type="number" {...register('bhk')} className="form-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input {...register('location')} className="form-input" placeholder="e.g. Bandra, Mumbai" />
                {errors.location && <p className="form-error">{errors.location.message}</p>}
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <input type="checkbox" {...register('parkingAvailable')} id="parking" className="w-4 h-4 accent-accent" />
                <label htmlFor="parking" className="text-sm font-medium text-primary cursor-pointer">Parking Available</label>
              </div>
            </div>

            <hr className="border-border" />
            <h3 className="font-display font-semibold text-primary">Ownership Details</h3>

            <div className="form-group">
              <label className="form-label">Link Existing Seller (Optional)</label>
              <select {...register('sellerId')} className="form-select">
                <option value="">-- No Seller Selected (Enter manually below) --</option>
                {sellers?.map((s: any) => (
                  <option key={s._id} value={s._id}>{s.sellerName} — {s.contactNumber}</option>
                ))}
              </select>
            </div>

            {!selectedSeller && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="form-group">
                  <label className="form-label">Owner Name</label>
                  <input {...register('ownerName')} className="form-input" placeholder="e.g. John Doe" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number</label>
                  <input {...register('contactNumber')} className="form-input" placeholder="e.g. 9876543210" />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : (isEdit ? 'Update Property' : 'Save Property')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
