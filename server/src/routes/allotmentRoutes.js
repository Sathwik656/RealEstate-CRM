'use strict';
const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const allotmentController = require('../controllers/allotmentController');

// All routes require authentication
router.use(auth);

// Agent routes
router.post(
  '/:propertyId/interest',
  authorizeRoles('agent'),
  allotmentController.expressInterest
);

// Admin routes
router.get(
  '/',
  authorizeRoles('admin'),
  allotmentController.getAllotments
);

router.post(
  '/:propertyId/allot',
  authorizeRoles('admin'),
  allotmentController.allotProperty
);

module.exports = router;
