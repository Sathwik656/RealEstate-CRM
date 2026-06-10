import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft, Upload } from 'lucide-react';

const schema = z.object({
  propertyRef: z.string().min(1, 'Required'),
  tenantRef: z.string().min(1, 'Required'),
  landlordName: z.string().min(1, 'Required'),
  leaseStartDate: z.string().min(1, 'Required'),
  leaseEndDate: z.string().min(1, 'Required'),
  leaseAmount: z.preprocess(Number, z.number().min(0)),
});
type FormValues = z.infer<typeof schema>;
interface Props { onSuccess: () => void; onCancel: () => void; }

export function CreateLease({ onSuccess, onCancel }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const { data: properties } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => (await api.get('/properties?limit=1000')).data.data,
  });
  const { data: tenants } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: async () => (await api.get('/tenants?limit=1000')).data.data,
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, String(v)));
      if (file) formData.append('document', file);
      await api.post('/leases', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSuccess();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to create lease');
    }
  };

  return (
    <div className="page-wrapper max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="btn-icon hover:text-primary hover:bg-surface-alt"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="page-title">Add Lease Agreement</h1>
          <p className="page-subtitle">Create a new rental lease</p>
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
                <label className="form-label">Link Tenant</label>
                <select {...register('tenantRef')} className="form-select">
                  <option value="">-- Select Tenant --</option>
                  {tenants?.map((t: any) => (
                    <option key={t._id} value={t._id}>{t.tenantName} ({t.contactNumber})</option>
                  ))}
                </select>
                {errors.tenantRef && <p className="form-error">{errors.tenantRef.message}</p>}
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Landlord Name</label>
                <input {...register('landlordName')} className="form-input" placeholder="e.g. John Doe" />
                {errors.landlordName && <p className="form-error">{errors.landlordName.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Lease Start Date</label>
                <input type="date" {...register('leaseStartDate')} className="form-input" />
                {errors.leaseStartDate && <p className="form-error">{errors.leaseStartDate.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Lease End Date</label>
                <input type="date" {...register('leaseEndDate')} className="form-input" />
                {errors.leaseEndDate && <p className="form-error">{errors.leaseEndDate.message}</p>}
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Lease Amount (₹/month)</label>
                <input type="number" {...register('leaseAmount')} className="form-input" />
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Lease Agreement Document (Optional)</label>
                <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-border rounded-lg cursor-pointer hover:border-accent hover:bg-surface-alt transition-colors">
                  <Upload size={18} className="text-muted" />
                  <span className="text-sm text-muted">
                    {file ? file.name : 'Click to upload PDF, DOC, or Image (max 5MB)'}
                  </span>
                  <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : 'Save Lease'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
