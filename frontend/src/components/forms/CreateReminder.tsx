import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { scheduleReminder, cancelReminder } from '@/lib/notifications';

const schema = z.object({
  title: z.string().min(1, 'Reminder title is required'),
  note: z.string().optional(),
  reminderDate: z.string().min(1, 'Date is required'),
  reminderTime: z.string().min(1, 'Time is required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function CreateReminder({ onSuccess, onCancel, initialData }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!initialData;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          note: initialData.note || '',
          reminderDate: initialData.reminderDate,
          reminderTime: initialData.reminderTime,
        }
      : {},
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      
      const dateTimeString = `${data.reminderDate}T${data.reminderTime}`;
      const reminderDateTime = new Date(dateTimeString);

      if (isNaN(reminderDateTime.getTime()) || reminderDateTime < new Date()) {
        setServerError('Reminder date and time must be in the future.');
        return;
      }

      let notificationId = isEdit ? initialData.notificationId : Math.floor(Math.random() * 2000000000);

      const payload = {
        ...data,
        notificationId,
      };

      if (isEdit) {
        // Cancel the old local notification if date/time/title changed
        await cancelReminder(notificationId);
        
        await api.put(`/reminders/${initialData._id}`, payload);
      } else {
        await api.post('/reminders', payload);
      }

      // Schedule the new native notification
      await scheduleReminder(
        notificationId,
        data.title,
        data.note || 'Reminder',
        reminderDateTime
      );

      onSuccess();
    } catch (err: any) {
      setServerError(
        err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} reminder`
      );
    }
  };

  return (
    <div className="page-wrapper max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="btn-icon hover:text-primary hover:bg-surface-alt"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Reminder' : 'Add New Reminder'}</h1>
          <p className="page-subtitle">
            {isEdit ? 'Update existing reminder details' : 'Set a new notification reminder'}
          </p>
        </div>
      </div>
      {serverError && <div className="alert-error">{serverError}</div>}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="form-group md:col-span-2">
                <label className="form-label">Reminder Title</label>
                <input
                  {...register('title')}
                  className="form-input"
                  placeholder="e.g. Call Client"
                />
                {errors.title && <p className="form-error">{errors.title.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  {...register('reminderDate')}
                  className="form-input"
                />
                {errors.reminderDate && (
                  <p className="form-error">{errors.reminderDate.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Time</label>
                <input
                  type="time"
                  {...register('reminderTime')}
                  className="form-input"
                />
                {errors.reminderTime && (
                  <p className="form-error">{errors.reminderTime.message}</p>
                )}
              </div>

              <div className="form-group md:col-span-2">
                <label className="form-label">Notes</label>
                <textarea
                  {...register('note')}
                  className="form-input"
                  rows={3}
                  placeholder="Any additional details..."
                />
                {errors.note && <p className="form-error">{errors.note.message}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCancel} className="btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting
                  ? 'Saving...'
                  : isEdit
                  ? 'Update Reminder'
                  : 'Save Reminder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
