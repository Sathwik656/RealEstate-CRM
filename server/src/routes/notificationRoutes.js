'use strict';
const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  subscribe,
  unsubscribe,
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

// All notification routes require authentication
router.use(auth);

// GET /api/notifications — get user's notifications
router.get('/', getNotifications);

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', markAllAsRead);

// DELETE /api/notifications/clear-all — delete all notifications
router.delete('/clear-all', clearAllNotifications);

// PATCH /api/notifications/:id/read — mark specific notification as read
router.patch('/:id/read', markAsRead);

// GET /api/notifications/settings — get notification preferences + VAPID key
router.get('/settings', getSettings);

// PUT /api/notifications/settings — toggle notifications on/off
router.put('/settings', updateSettings);

// POST /api/notifications/subscribe — register push subscription for current device
router.post('/subscribe', subscribe);

// DELETE /api/notifications/unsubscribe — remove push subscription for current device
router.delete('/unsubscribe', unsubscribe);

module.exports = router;
