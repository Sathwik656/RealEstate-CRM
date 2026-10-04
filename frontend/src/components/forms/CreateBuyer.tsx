import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';
import { SegmentedControl } from '../ui/FormControls';

const PROPERTY_TYPES = [
  'Land',
  'Shop',
  'Independent House',
  'Flat',
  'Store',
  'Garage',
];

const schema = z.object({
  buyerName: z.string().min(1, 'Required'),
  contactNumber: z.string().min(10, 'Min 10 digits'),
  preferredLocation: z.string().min(1, 'Required'),
  propertyTypeInterested: z.string().optional(),
  purpose: z.enum(['Purchase', 'Rent']),
  budgetMax: z.preprocess(Number, z.number().min(0)),
  bhkRequirement: z.preprocess(Number, z.number().min(1)),
  areaRequirement: z.preprocess(Number, z.number().min(0)),
  status: z.enum(['Active', 'Closed']),
  note: z.string().optional(),
  referredByAgentId: z.string().optional(),
  reminderDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
interface Props { onSuccess: () => void; onCancel: () => void; initialData?: any; }

export function CreateBuyer({ onSuccess, onCancel, initialData }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showReferral, setShowReferral] = useState(!!initialData?.referredByAgentId);
  const [enableReminder, setEnableReminder] = useState(!!initialData?.reminderDate && initialData?.reminderStatus === 'pending');
  const isEdit = !!initialData;

  const { data: agents } = useQuery({
    queryKey: ['agents-list'],
    queryFn: async () => {
      const res = await api.get('/users/agents');
      return res.data.data.filter((a: any) => a.approvalStatus === 'approved' || !a.approvalStatus);
    }
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData ? { 
      ...initialData,
      referredByAgentId: initialData.referredByAgentId?._id || initialData.referredByAgentId || '',
      reminderDate: initialData.reminderDate ? new Date(initialData.reminderDate).toISOString().slice(0, 16) : '',
    } : { status: 'Active', purpose: 'Purchase' },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      const payload: any = { ...data };
      if (!payload.referredByAgentId) delete payload.referredByAgentId;
      if (!payload.propertyTypeInterested) delete payload.propertyTypeInterested;
      if (!enableReminder) payload.reminderDate = null;
      else if (!payload.reminderDate) delete payload.reminderDate;

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
    <div className="page-wrapper max-w-3xl mx-auto py-6 px-4 sm:px-6">
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
              <div className="form-group">
                <label className="form-label">Preferred Location</label>
                <input {...register('preferredLocation')} className="form-input" placeholder="e.g. Juhu" />
                {errors.preferredLocation && <p className="form-error">{errors.preferredLocation.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Property Type</label>
                <select {...register('propertyTypeInterested')} className="form-select">
                  <option value="">Any Type</option>
                  {PROPERTY_TYPES.map(pt => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
                {errors.propertyTypeInterested && <p className="form-error">{errors.propertyTypeInterested.message}</p>}
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
              <div className="form-group">
                <label className="form-label">Area</label>
                <div className="relative">
                  <input type="number" {...register('areaRequirement')} className="form-input pr-12" placeholder="e.g. 1500" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">sq ft</span>
                </div>
                {errors.areaRequirement && <p className="form-error">{errors.areaRequirement.message}</p>}
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
                    <option key={agent._id} value={agent._id}>{agent.name} ({agent.code || "NO CODE"})</option>
                  ))}
                </select>
                <p className="form-helper">Links this buyer registration to an agent for commission or tracking.</p>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Reminder */}
        <div className="form-card">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="form-card-header mb-0">Buyer Reminder</h2>
                <p className="text-sm text-slate-500">Get notified to follow up with this buyer.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={enableReminder} 
                  onChange={(e) => setEnableReminder(e.target.checked)} 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>
            
            {enableReminder && (
              <div className="form-group mt-4 pt-4 border-t border-slate-100">
                <label className="form-label">Remind me on</label>
                <input 
                  type="datetime-local" 
                  {...register('reminderDate')} 
                  className="form-input" 
                />
                {errors.reminderDate && <p className="form-error">{errors.reminderDate.message}</p>}
                <p className="form-helper mt-2">You will receive an in-app and push notification at this exact time.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={onCancel} className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 sm:border-0 text-center">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 text-center">
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Buyer' : 'Save Buyer')}
          </button>
        </div>
      </form>
    </div>
  );
}
