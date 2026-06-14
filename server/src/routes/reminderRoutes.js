const express = require('express');
const {
  getAllReminders,
  getReminderById,
  getReminderByBuyerId,
  createReminder,
  updateReminder,
  deleteReminder,
} = require('../controllers/reminderController');
const auth = require('../middleware/auth');

const router = express.Router();

// All reminder routes are protected
router.use(auth);

router.route('/')
  .get(getAllReminders)
  .post(createReminder);

router.get('/buyer/:buyerId', getReminderByBuyerId);

router.route('/:id')
  .get(getReminderById)
  .put(updateReminder)
  .delete(deleteReminder);

module.exports = router;
