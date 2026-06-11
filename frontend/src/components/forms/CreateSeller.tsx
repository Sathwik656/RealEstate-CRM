import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

const schema = z.object({
  sellerName: z.string().min(1, 'Required'),
  contactNumber: z.string().min(10, 'Min 10 digits'),
  address: z.string().min(1, 'Required'),
});
type FormValues = z.infer<typeof schema>;
interface Props { onSuccess: () => void; onCancel: () => void; initialData?: any; }

export function CreateSeller({ onSuccess, onCancel, initialData }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!initialData;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData || {},
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      if (isEdit) {
        await api.put(`/sellers/${initialData._id}`, data);
      } else {
        await api.post('/sellers', data);
      }
      onSuccess();
    } catch (err: any) {
      setServerError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} seller`);
    }
  };

  return (
    <div className="page-wrapper max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="btn-icon hover:text-primary hover:bg-surface-alt"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Seller' : 'Add New Seller'}</h1>
          <p className="page-subtitle">{isEdit ? 'Update seller details' : 'Register a property owner or seller'}</p>
        </div>
      </div>
      {serverError && <div className="alert-error">{serverError}</div>}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="form-group">
              <label className="form-label">Seller Name</label>
              <input {...register('sellerName')} className="form-input" placeholder="e.g. Alice Smith" />
              {errors.sellerName && <p className="form-error">{errors.sellerName.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input {...register('contactNumber')} className="form-input" placeholder="e.g. 9988776655" />
              {errors.contactNumber && <p className="form-error">{errors.contactNumber.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea {...register('address')} rows={3} className="form-input resize-none" placeholder="e.g. Andheri West, Mumbai" />
              {errors.address && <p className="form-error">{errors.address.message}</p>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : (isEdit ? 'Update Seller' : 'Save Seller')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
