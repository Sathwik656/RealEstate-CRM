import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';
import { LocationSelect } from './LocationSelect';
import { SegmentedControl, SwitchToggle } from '../ui/FormControls';

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
  const [showReferral, setShowReferral] = useState(!!initialData?.referredByAgentId);
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
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedSeller = watch('sellerId');
  const watchPropertyType = watch('propertyType');

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
    <div className="page-wrapper max-w-3xl pb-24 mx-auto pt-6 px-4 sm:px-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{isEdit ? 'Edit Property' : 'Add New Property'}</h1>
          <p className="text-sm text-slate-500">{isEdit ? 'Update existing property details' : 'Create a new listing in the CRM'}</p>
        </div>
      </div>

      {serverError && <div className="alert-error mb-6">{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        
        {/* Card 1: Basic Information */}
        <div className="form-card">
          <div className="p-5 sm:p-6">
            <h2 className="form-card-header">Basic Information</h2>
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
                    label="Price"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.price?.message}
                  />
                )}
              />

              <div className="form-group flex flex-col">
                <label className="form-label">Area</label>
                <div className="relative flex-1">
                  <input type="number" {...register('area')} className="form-input pr-12" placeholder="e.g. 1500" />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-slate-400 text-sm">sq ft</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Property Specifications */}
        <div className="form-card">
          <div className="p-5 sm:p-6">
            <h2 className="form-card-header">Property Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(!watchPropertyType || ['Independent House', 'Flat'].includes(watchPropertyType)) && (
                <div className="form-group">
                  <label className="form-label">BHK</label>
                  <input type="number" {...register('bhk')} className="form-input" placeholder="e.g. 2" />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Year of Construction</label>
                <input type="month" {...register('yearOfConstruction')} className="form-input" />
              </div>

              <div className="form-group md:col-span-2">
                <label className="form-label mb-2">Main Door Direction</label>
                <Controller
                  name="mainDoorDirection"
                  control={control}
                  render={({ field }) => (
                    <SegmentedControl
                      options={[
                        { label: 'None', value: '' },
                        { label: 'North', value: 'North' },
                        { label: 'East', value: 'East' },
                        { label: 'West', value: 'West' },
                        { label: 'South', value: 'South' },
                      ]}
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="form-group md:col-span-2 pt-2">
                <Controller
                  name="parkingAvailable"
                  control={control}
                  render={({ field }) => (
                    <SwitchToggle 
                      checked={field.value} 
                      onChange={field.onChange} 
                      label="Parking Available" 
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Location Details */}
        <div className="form-card">
          <div className="p-5 sm:p-6">
            <h2 className="form-card-header">Location Details</h2>
            <div className="grid grid-cols-1 gap-5">
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

              <div className="form-group">
                <label className="form-label">Complete Address</label>
                <textarea {...register('address')} className="form-input min-h-[100px]" placeholder="e.g. 402, Sea View Apartments, Carter Road..." />
                {errors.address && <p className="form-error">{errors.address.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Ownership Details */}
        <div className="form-card">
          <div className="p-5 sm:p-6">
            <h2 className="form-card-header">Ownership Details</h2>
            <div className="grid grid-cols-1 gap-5">
              <div className="form-group">
                <label className="form-label">Link Existing Seller</label>
                <select {...register('sellerId')} className="form-select">
                  <option value="">-- No Seller Selected (Enter manually below) --</option>
                  {sellers?.map((s: any) => (
                    <option key={s._id} value={s._id}>{s.sellerName} — {s.contactNumber}</option>
                  ))}
                </select>
                <p className="form-helper">Links the property to an existing seller account in the CRM.</p>
              </div>

              {!selectedSeller && (
                <div className="form-group md:w-1/2">
                  <label className="form-label">Contact Number (Optional)</label>
                  <input {...register('contactNumber')} className="form-input" placeholder="e.g. 9876543210" />
                </div>
              )}

              {!showReferral ? (
                <div className="pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowReferral(true)} 
                    className="w-full py-3 rounded-lg border-2 border-dashed border-slate-300 text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    + Add Agent Referral
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <div className="form-group">
                    <label className="form-label">Referred By</label>
                    <select {...register('referredByAgentId')} className="form-select">
                      <option value="">Select Agent ▼</option>
                      {agents?.map((agent: any) => (
                        <option key={agent._id} value={agent._id}>{agent.name} ({agent.email})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar (Sticky Footer) */}
        <div className="sticky-action-bar">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Property' : 'Save Property')}
          </button>
        </div>
      </form>
    </div>
  );
}
