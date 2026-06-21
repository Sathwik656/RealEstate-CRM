const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Buyer',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    reminderDate: {
      type: String,
      required: [true, 'Reminder date is required'],
    },
    reminderTime: {
      type: String,
      required: [true, 'Reminder time is required'],
    },
    reminderDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    notificationId: {
      type: Number,
      required: true,
      index: true,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user-specific chronological querying
reminderSchema.index({ userId: 1, reminderDateTime: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);

module.exports = Reminder;
