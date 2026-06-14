const Reminder = require('../models/Reminder');

/**
 * @desc    Get all reminders for logged in user
 * @route   GET /api/reminders
 * @access  Private
 */
const getAllReminders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const limitNum = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * limitNum;

    const query = { userId: req.user._id };

    const reminders = await Reminder.find(query)
      .sort({ reminderDateTime: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Reminder.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: reminders.length,
      pagination: {
        page: parseInt(page, 10),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      data: reminders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single reminder by ID
 * @route   GET /api/reminders/:id
 * @access  Private
 */
const getReminderById = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.user._id });

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    return res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new reminder
 * @route   POST /api/reminders
 * @access  Private
 */
const createReminder = async (req, res, next) => {
  try {
    const { title, note, reminderDate, reminderTime, notificationId, buyerId } = req.body;

    if (!title || !reminderDate || !reminderTime || notificationId === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide title, date, time and notificationId' });
    }

    // Combine date and time to create Date object
    const dateTimeString = `${reminderDate}T${reminderTime}`;
    const reminderDateTime = new Date(dateTimeString);

    if (isNaN(reminderDateTime.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date or time format' });
    }

    if (reminderDateTime < new Date()) {
      return res.status(400).json({ success: false, message: 'Reminder must be scheduled in the future' });
    }

    const reminder = await Reminder.create({
      userId: req.user._id,
      buyerId,
      title,
      note,
      reminderDate,
      reminderTime,
      reminderDateTime,
      notificationId,
    });

    return res.status(201).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update reminder
 * @route   PUT /api/reminders/:id
 * @access  Private
 */
const updateReminder = async (req, res, next) => {
  try {
    const { title, note, reminderDate, reminderTime, notificationId, buyerId } = req.body;

    const updateFields = {};
    if (title) updateFields.title = title;
    if (note !== undefined) updateFields.note = note;
    if (notificationId !== undefined) updateFields.notificationId = notificationId;
    if (buyerId !== undefined) updateFields.buyerId = buyerId;

    if (reminderDate || reminderTime) {
      const existing = await Reminder.findOne({ _id: req.params.id, userId: req.user._id });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Reminder not found' });
      }

      const newDate = reminderDate || existing.reminderDate;
      const newTime = reminderTime || existing.reminderTime;
      
      const dateTimeString = `${newDate}T${newTime}`;
      const reminderDateTime = new Date(dateTimeString);

      if (isNaN(reminderDateTime.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date or time format' });
      }

      if (reminderDateTime < new Date()) {
        return res.status(400).json({ success: false, message: 'Reminder must be scheduled in the future' });
      }

      updateFields.reminderDate = newDate;
      updateFields.reminderTime = newTime;
      updateFields.reminderDateTime = reminderDateTime;
    }

    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    return res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete reminder
 * @route   DELETE /api/reminders/:id
 * @access  Private
 */
const deleteReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    return res.status(200).json({
      success: true,
      data: {},
      message: 'Reminder deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single reminder by buyer ID
 * @route   GET /api/reminders/buyer/:buyerId
 * @access  Private
 */
const getReminderByBuyerId = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOne({ buyerId: req.params.buyerId, userId: req.user._id });

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    return res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllReminders,
  getReminderById,
  getReminderByBuyerId,
  createReminder,
  updateReminder,
  deleteReminder,
};
