'use strict';
const cron = require('node-cron');
const Buyer = require('../models/Buyer');
const { notifyBuyerReminder } = require('./pushNotificationService');

const initReminderCron = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Find buyers with a pending reminder where the date/time is past or exactly now
      const dueBuyers = await Buyer.find({
        reminderStatus: 'pending',
        reminderDate: { $lte: now, $ne: null },
      });

      for (const buyer of dueBuyers) {
        // Update status immediately to prevent duplicate notifications if loop takes time
        await Buyer.updateOne(
          { _id: buyer._id },
          { $set: { reminderStatus: 'completed' } }
        );

        // Send notification
        await notifyBuyerReminder(buyer);
      }
      
      if (dueBuyers.length > 0) {
        console.log(`Processed ${dueBuyers.length} buyer reminders.`);
      }
    } catch (error) {
      console.error('Error running reminder cron job:', error);
    }
  });

  console.log('Buyer Reminder cron job initialized.');
};

module.exports = initReminderCron;
