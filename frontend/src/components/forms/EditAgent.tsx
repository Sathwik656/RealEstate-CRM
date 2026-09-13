import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  initialData: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditAgent({ initialData, onSuccess, onCancel }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData.name,
      email: initialData.email,
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      await api.put(`/users/agents/${initialData._id}`, data);
      onSuccess();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to update agent details');
    }
  };

  return (
    <div className="page-wrapper max-w-3xl pb-24 mx-auto pt-6 px-4 sm:px-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Agent</h1>
          <p className="text-sm text-slate-500">Update agent profile details</p>
        </div>
      </div>
      
      {serverError && <div className="alert-error mb-6">{serverError}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Card 1: Agent Details */}
        <div className="form-card">
          <div className="p-5 sm:p-6">
            <h2 className="form-card-header">Agent Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="form-group md:col-span-2">
                <label className="form-label">Full Name</label>
                <input {...register('name')} className="form-input" placeholder="e.g. John Doe" />
                {errors.name && <p className="form-error">{errors.name.message}</p>}
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Email Address</label>
                <input {...register('email')} type="email" className="form-input" placeholder="e.g. agent@veenu.com" />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar (Sticky Footer) */}
        <div className="sticky-action-bar">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
            {isSubmitting ? 'Saving...' : 'Update Agent'}
          </button>
        </div>
      </form>
    </div>
  );
}
