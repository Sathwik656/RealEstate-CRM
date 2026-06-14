import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { ArrowLeft, Bell } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';
import { scheduleReminder, cancelReminder } from '@/lib/notifications';

const schema = z.object({
  buyerName: z.string().min(1, 'Required'),
  contactNumber: z.string().min(10, 'Min 10 digits'),
  preferredLocation: z.string().min(1, 'Required'),
  budgetMax: z.preprocess(Number, z.number().min(0)),
  bhkRequirement: z.preprocess(Number, z.number().min(1)),
  followUpDate: z.string().min(1, 'Required'),
  note: z.string().optional(),
  
  addReminder: z.boolean().optional(),
  reminderTitle: z.string().optional(),
  reminderDate: z.string().optional(),
  reminderTime: z.string().optional(),
  reminderNote: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.addReminder) {
    if (!data.reminderTitle) {
      ctx.addIssue({ path: ['reminderTitle'], message: 'Required', code: z.ZodIssueCode.custom });
    }
    if (!data.reminderDate) {
      ctx.addIssue({ path: ['reminderDate'], message: 'Required', code: z.ZodIssueCode.custom });
    }
    if (!data.reminderTime) {
      ctx.addIssue({ path: ['reminderTime'], message: 'Required', code: z.ZodIssueCode.custom });
    }
  }
});

type FormValues = z.infer<typeof schema>;
interface Props { onSuccess: () => void; onCancel: () => void; initialData?: any; }

export function CreateBuyer({ onSuccess, onCancel, initialData }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [existingReminder, setExistingReminder] = useState<any>(null);
  const isEdit = !!initialData;

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData ? {
      ...initialData,
      followUpDate: initialData.followUpDate ? new Date(initialData.followUpDate).toISOString().split('T')[0] : '',
      addReminder: false,
    } : {
      addReminder: false,
    },
  });

  const addReminder = watch('addReminder');
  const buyerName = watch('buyerName');
  const followUpDate = watch('followUpDate');

  useEffect(() => {
    if (isEdit && initialData?._id) {
      api.get(`/reminders/buyer/${initialData._id}`)
        .then(res => {
          const rem = res.data.data;
          if (rem) {
            setExistingReminder(rem);
            setValue('addReminder', true);
            setValue('reminderTitle', rem.title);
            setValue('reminderDate', rem.reminderDate);
            setValue('reminderTime', rem.reminderTime);
            setValue('reminderNote', rem.note || '');
          }
        })
        .catch(() => setExistingReminder(null));
    }
  }, [isEdit, initialData, setValue]);

  // Auto-populate reminder fields if they enable it and fields are empty
  useEffect(() => {
    if (addReminder && !isEdit) {
       const currentTitle = watch('reminderTitle');
       if (!currentTitle && buyerName) {
         setValue('reminderTitle', `Follow up with ${buyerName}`);
       }
       if (!watch('reminderDate') && followUpDate) {
         setValue('reminderDate', followUpDate);
       }
       if (!watch('reminderTime')) {
         setValue('reminderTime', '10:00');
       }
    }
  }, [addReminder, buyerName, followUpDate, isEdit, setValue, watch]);

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError(null);
      let payload: any = { ...data, reminder: null };
      
      if (data.addReminder) {
        const dateTimeString = `${data.reminderDate}T${data.reminderTime}`;
        const reminderDateTime = new Date(dateTimeString);

        if (isNaN(reminderDateTime.getTime()) || reminderDateTime < new Date()) {
          setServerError('Reminder date and time must be in the future.');
          return;
        }

        const notificationId = existingReminder ? existingReminder.notificationId : Math.floor(Math.random() * 2000000000);
        
        payload.reminder = {
          title: data.reminderTitle,
          reminderDate: data.reminderDate,
          reminderTime: data.reminderTime,
          note: data.reminderNote,
          notificationId,
        };
      }

      if (isEdit) {
        // If we had an existing reminder, but user disabled it, we must cancel the local notification
        if (!data.addReminder && existingReminder) {
          await cancelReminder(existingReminder.notificationId);
        } else if (data.addReminder && existingReminder) {
          // If editing an existing one, cancel the old one first
          await cancelReminder(existingReminder.notificationId);
        }
        await api.put(`/buyers/${initialData._id}`, payload);
      } else {
        await api.post('/buyers', payload);
      }
      
      if (data.addReminder && payload.reminder) {
        const dateTimeString = `${data.reminderDate}T${data.reminderTime}`;
        const reminderDateTime = new Date(dateTimeString);
        await scheduleReminder(
          payload.reminder.notificationId,
          payload.reminder.title,
          payload.reminder.note || 'Reminder',
          reminderDateTime
        );
      }

      onSuccess();
    } catch (err: any) {
      setServerError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} buyer`);
    }
  };

  return (
    <div className="page-wrapper max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="btn-icon hover:text-primary hover:bg-surface-alt"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Buyer' : 'Add New Buyer'}</h1>
          <p className="page-subtitle">{isEdit ? 'Update buyer details' : 'Register a prospective property buyer'}</p>
        </div>
      </div>
      {serverError && <div className="alert-error">{serverError}</div>}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                <label className="form-label">Preferred Location</label>
                <input {...register('preferredLocation')} className="form-input" placeholder="e.g. Juhu" />
                {errors.preferredLocation && <p className="form-error">{errors.preferredLocation.message}</p>}
              </div>
              <Controller
                name="budgetMax"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id="budgetMax"
                    label="Max Budget (₹)"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.budgetMax?.message}
                  />
                )}
              />
              <div className="form-group">
                <label className="form-label">BHK Requirement</label>
                <input type="number" {...register('bhkRequirement')} className="form-input" />
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Next Contact</label>
                <input type="date" {...register('followUpDate')} className="form-input" />
                {errors.followUpDate && <p className="form-error">{errors.followUpDate.message}</p>}
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Note (Optional)</label>
                <textarea {...register('note')} rows={3} className="form-input resize-none" placeholder="Add a note" />
              </div>
            </div>

            {/* Integrated Reminder Section */}
            <div className="border border-border rounded-xl overflow-hidden bg-surface-alt/30">
              <div className="p-4 flex items-center justify-between border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-primary" />
                  <span className="font-semibold text-content">Set a Reminder</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" {...register('addReminder')} className="sr-only peer" />
                  <div className="w-11 h-6 bg-muted/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              
              {addReminder && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="form-group md:col-span-2">
                    <label className="form-label">Reminder Title</label>
                    <input {...register('reminderTitle')} className="form-input" placeholder="e.g. Call to discuss properties" />
                    {errors.reminderTitle && <p className="form-error">{errors.reminderTitle.message}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" {...register('reminderDate')} className="form-input" />
                    {errors.reminderDate && <p className="form-error">{errors.reminderDate.message}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time</label>
                    <input type="time" {...register('reminderTime')} className="form-input" />
                    {errors.reminderTime && <p className="form-error">{errors.reminderTime.message}</p>}
                  </div>
                  <div className="form-group md:col-span-2">
                    <label className="form-label">Reminder Note (Optional)</label>
                    <textarea {...register('reminderNote')} rows={2} className="form-input resize-none" placeholder="Any extra details..." />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : (isEdit ? 'Update Buyer' : 'Save Buyer')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
