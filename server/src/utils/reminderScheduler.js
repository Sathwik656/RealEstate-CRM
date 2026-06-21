'use strict';
const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { sendReminderEmail } = require('./emailService');

/**
 * Reminder email scheduler.
 *
 * Runs every minute. Finds ALL reminders whose reminderDateTime is in the past
 * and emailSent is not yet true, then sends emails.
 *
 * Using "all past unsent" (not a sliding 60-second window) ensures no reminder
 * is ever missed — whether the server was down, the reminder was created while
 * the server was offline, or the reminder was already overdue when the system
 * started.
 *
 * This runs entirely server-side and is completely independent of the existing
 * Capacitor LocalNotifications (Android in-app) system — both work in parallel.
 */
const startReminderEmailScheduler = () => {
  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Find ALL past reminders that haven't had an email sent yet
      const dueReminders = await Reminder.find({
        reminderDateTime: { $lte: now },
        emailSent: { $ne: true },
      });

      if (!dueReminders.length) return;

      console.log(`[ReminderScheduler] Found ${dueReminders.length} unsent reminder(s). Sending emails...`);

      for (const reminder of dueReminders) {
        try {
          // Fetch the owner's registered email
          const user = await User.findById(reminder.userId).select('email name');
          if (!user || !user.email) {
            console.warn(`[ReminderScheduler] No user/email for reminder ${reminder._id} — skipping`);
            // Mark as sent anyway so we don't retry forever on a missing user
            await Reminder.findByIdAndUpdate(reminder._id, { emailSent: true });
            continue;
          }

          await sendReminderEmail(
            user.email,
            reminder.title,
            reminder.note,
            reminder.reminderDateTime
          );

          // Mark sent so we never resend this reminder
          await Reminder.findByIdAndUpdate(reminder._id, { emailSent: true });

          console.log(`[ReminderScheduler] ✅ Email sent for "${reminder.title}" → ${user.email}`);
        } catch (err) {
          console.error(
            `[ReminderScheduler] ❌ Failed for reminder "${reminder.title}" (${reminder._id}):`,
            err.message
          );
          // Do NOT mark emailSent=true on error — will retry next minute
        }
      }
    } catch (err) {
      console.error('[ReminderScheduler] Scheduler tick error:', err.message);
    }
  });

  console.log('[ReminderScheduler] Email reminder scheduler started (runs every minute).');
};

module.exports = { startReminderEmailScheduler };
