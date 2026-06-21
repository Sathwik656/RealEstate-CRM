'use strict';
const cron = require('node-cron');
const https = require('https');
const http = require('http');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { sendReminderEmail } = require('./emailService');

/**
 * Checks for all past-due reminders and sends emails for any that haven't
 * been sent yet. Called both on startup and by the cron scheduler.
 */
const processOverdueReminders = async () => {
  const now = new Date();

  const dueReminders = await Reminder.find({
    reminderDateTime: { $lte: now },
    emailSent: { $ne: true },
  });

  if (!dueReminders.length) return;

  console.log(`[ReminderScheduler] Found ${dueReminders.length} unsent reminder(s). Sending emails...`);

  for (const reminder of dueReminders) {
    try {
      const user = await User.findById(reminder.userId).select('email name');
      if (!user || !user.email) {
        console.warn(`[ReminderScheduler] No user/email for reminder ${reminder._id} — skipping`);
        await Reminder.findByIdAndUpdate(reminder._id, { emailSent: true });
        continue;
      }

      await sendReminderEmail(
        user.email,
        reminder.title,
        reminder.note,
        reminder.reminderDateTime
      );

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
};

/**
 * Pings the server's own health endpoint every 14 minutes.
 * This prevents Render free tier from spinning down the server and
 * killing the cron scheduler (Render sleeps after 15 min of inactivity).
 */
const startKeepAlive = () => {
  const serverUrl = process.env.SERVER_URL;
  if (!serverUrl) {
    console.log('[KeepAlive] SERVER_URL not set — keep-alive disabled (set it on Render to prevent sleep).');
    return;
  }

  // Ping every 14 minutes (Render sleeps after 15 min)
  cron.schedule('*/14 * * * *', () => {
    const url = `${serverUrl}/api/health`;
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      console.log(`[KeepAlive] Pinged ${url} — status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.warn(`[KeepAlive] Ping failed: ${err.message}`);
    });
  });

  console.log(`[KeepAlive] Keep-alive started — pinging ${serverUrl}/api/health every 14 minutes.`);
};

/**
 * Reminder email scheduler.
 *
 * 1. Runs processOverdueReminders immediately on startup — catches any
 *    reminders that fired while the server was asleep (Render free tier).
 * 2. Schedules a cron job every minute to catch new reminders going forward.
 * 3. Starts a keep-alive ping every 14 minutes to prevent Render sleep.
 */
const startReminderEmailScheduler = () => {
  // --- 1. Run immediately on startup to catch missed reminders ---
  console.log('[ReminderScheduler] Running startup check for overdue reminders...');
  processOverdueReminders().catch(err =>
    console.error('[ReminderScheduler] Startup check error:', err.message)
  );

  // --- 2. Run every minute for future reminders ---
  cron.schedule('* * * * *', () => {
    processOverdueReminders().catch(err =>
      console.error('[ReminderScheduler] Scheduler tick error:', err.message)
    );
  });

  // --- 3. Keep-alive to prevent Render free tier sleep ---
  startKeepAlive();

  console.log('[ReminderScheduler] Email reminder scheduler started (runs every minute).');
};

module.exports = { startReminderEmailScheduler };

