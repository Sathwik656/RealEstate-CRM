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
    <div className="page-wrapper max-w-xl">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="btn-icon hover:text-primary hover:bg-surface-alt">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">Edit Agent</h1>
          <p className="page-subtitle">Update agent profile details</p>
        </div>
      </div>
      {serverError && <div className="alert-error">{serverError}</div>}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input {...register('name')} className="form-input" placeholder="e.g. John Doe" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input {...register('email')} type="email" className="form-input" placeholder="e.g. agent@veenu.com" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : 'Update Agent'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
