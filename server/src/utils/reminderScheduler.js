'use strict';
const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { sendReminderEmail } = require('./emailService');

/**
 * Reminder email scheduler.
 *
 * Runs every minute. Finds all reminders whose reminderDateTime has passed
 * within the last minute (i.e., are now due) and sends an email to the
 * owning user's registered email address.
 *
 * This runs entirely server-side and is completely independent of the
 * existing Capacitor LocalNotifications (Android in-app) system — both
 * work in parallel without interfering with each other.
 */
const startReminderEmailScheduler = () => {
  // Runs at the start of every minute: "* * * * *"
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Look back 60 seconds to catch reminders that fired during the last tick
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      // Find reminders due in this window that have NOT yet had their email sent
      const dueReminders = await Reminder.find({
        reminderDateTime: { $gte: oneMinuteAgo, $lte: now },
        emailSent: { $ne: true },
      });

      if (!dueReminders.length) return;

      console.log(`[ReminderScheduler] Found ${dueReminders.length} due reminder(s). Sending emails...`);

      for (const reminder of dueReminders) {
        try {
          // Fetch the user to get their registered email
          const user = await User.findById(reminder.userId).select('email name');
          if (!user || !user.email) {
            console.warn(`[ReminderScheduler] No user/email found for reminder ${reminder._id}`);
            continue;
          }

          await sendReminderEmail(
            user.email,
            reminder.title,
            reminder.note,
            reminder.reminderDateTime
          );

          // Mark this reminder so we don't send the email again on the next tick
          await Reminder.findByIdAndUpdate(reminder._id, { emailSent: true });
        } catch (err) {
          console.error(`[ReminderScheduler] Failed to send email for reminder ${reminder._id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[ReminderScheduler] Scheduler error:', err.message);
    }
  });

  console.log('[ReminderScheduler] Email reminder scheduler started (runs every minute).');
};

module.exports = { startReminderEmailScheduler };
