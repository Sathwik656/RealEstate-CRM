import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';
import { LocationSelect } from './LocationSelect';

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
  contactNumber: z.string().optional(),
  referredByAgentId: z.string().optional(),
  mainDoorDirection: z.string().optional().or(z.literal('')),
  yearOfConstruction: z.string().optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props { onSuccess: () => void; onCancel: () => void; initialData?: any; }

export function CreateProperty({ onSuccess, onCancel, initialData }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!initialData;

  const { data: sellers, isLoading: loadingSellers } = useQuery({
    queryKey: ['sellers-list'],
    queryFn: async () => (await api.get('/sellers?limit=1000')).data.data,
  });

  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['agents-list'],
    queryFn: async () => (await api.get('/users/agents')).data.data,
  });

  const { data: locations, isLoading: loadingLocs } = useQuery({
    queryKey: ['locations-list'],
    queryFn: async () => (await api.get('/locations?limit=1000')).data.data,
  });

  const { register, handleSubmit, watch, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData ? {
      ...initialData,
      sellerId: initialData.sellerId?._id || initialData.sellerId || '',
      referredByAgentId: initialData.referredByAgentId?._id || initialData.referredByAgentId || '',
      mainDoorDirection: initialData.mainDoorDirection || '',
      yearOfConstruction: initialData.yearOfConstruction ? new Date(initialData.yearOfConstruction).toISOString().slice(0, 7) : '',
      address: initialData.address || '',
      location: initialData.location?._id || initialData.location || '',
    } : { parkingAvailable: false, sellerId: '', mainDoorDirection: '', yearOfConstruction: '', address: '', location: '' },
  });

  if (loadingSellers || loadingAgents || loadingLocs) {
    return (
      <div className="page-wrapper max-w-2xl flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedSeller = watch('sellerId');

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      const payload: any = { ...data };
      if (!payload.sellerId) delete payload.sellerId;
      if (!payload.referredByAgentId) delete payload.referredByAgentId;
      if (!payload.mainDoorDirection) delete payload.mainDoorDirection;
      if (!payload.yearOfConstruction) delete payload.yearOfConstruction;
      if (!payload.address) delete payload.address;
      if (payload.propertyType && !['Independent House', 'Flat'].includes(payload.propertyType)) {
        payload.bhk = null;
      }
      
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
                  <option>Land</option>
                  <option>Shop</option>
                  <option>Independent House</option>
                  <option>Flat</option>
                  <option>Store</option>
                  <option>Garage</option>
                </select>
                {errors.propertyType && <p className="form-error">{errors.propertyType.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Purpose</label>
                <select {...register('purpose')} className="form-select">
                  <option value="">Select Purpose</option>
                  <option>Sale</option>
                  <option>Rent</option>
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

              {(!watch('propertyType') || ['Independent House', 'Flat'].includes(watch('propertyType'))) && (
                <div className="form-group">
                  <label className="form-label">BHK</label>
                  <input type="number" {...register('bhk')} className="form-input" />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Year of Construction</label>
                <input type="month" {...register('yearOfConstruction')} className="form-input text-sm py-2" />
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <Controller
                  name="location"
                  control={control}
                  render={({ field }) => (
                    <LocationSelect
                      value={field.value}
                      onChange={field.onChange}
                      locations={locations || []}
                      error={errors.location?.message}
                    />
                  )}
                />
                {errors.location && <p className="form-error">{errors.location.message}</p>}
              </div>

              <div className="form-group md:col-span-2">
                <label className="form-label">Complete Address</label>
                <textarea {...register('address')} className="form-input min-h-[80px] py-3" placeholder="e.g. 402, Sea View Apartments, Carter Road..." />
                {errors.address && <p className="form-error">{errors.address.message}</p>}
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <input type="checkbox" {...register('parkingAvailable')} id="parking" className="w-4 h-4 accent-accent" />
                <label htmlFor="parking" className="text-sm font-medium text-primary cursor-pointer">Parking Available</label>
              </div>

              <div className="md:col-span-2">
                <label className="form-label mb-3 block">Main Door Direction</label>
                <div className="flex flex-wrap gap-4">
                  {['North', 'East', 'West', 'South'].map((dir) => (
                    <label key={dir} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        value={dir} 
                        {...register('mainDoorDirection')} 
                        className="w-4 h-4 accent-accent" 
                      />
                      <span className="text-sm font-medium text-primary">{dir}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer ml-2">
                    <input 
                      type="radio" 
                      value="" 
                      {...register('mainDoorDirection')} 
                      className="w-4 h-4 accent-accent" 
                    />
                    <span className="text-sm font-medium text-muted">None</span>
                  </label>
                </div>
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
              <div className="form-group">
                <label className="form-label">Contact Number (Optional)</label>
                <input {...register('contactNumber')} className="form-input" placeholder="e.g. 9876543210" />
              </div>
            )}

            <hr className="border-border" />
            <h3 className="font-display font-semibold text-primary">Agent Referral</h3>

            <div className="form-group">
              <label className="form-label">Referred By (Agent)</label>
              <select {...register('referredByAgentId')} className="form-select">
                <option value="">-- No Agent Assigned --</option>
                {agents?.map((agent: any) => (
                  <option key={agent._id} value={agent._id}>{agent.name} ({agent.email})</option>
                ))}
              </select>
            </div>

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
