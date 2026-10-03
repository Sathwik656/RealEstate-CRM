'use strict';
const express = require('express');
const router = express.Router();
const {
  getMyDeals,
  getAllDeals,
  getDealById,
  markDealDone,
  approveDeal,
  directSellProperty,
  approveDealValidation,
} = require('../controllers/dealController');
const { requestUnassignment } = require('../controllers/reassignmentController');
const { auth, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(auth);

// Agent: view their own deals
router.get('/my', authorizeRoles('agent'), getMyDeals);

// Agent: mark deal as done
router.patch('/:id/done', authorizeRoles('agent'), markDealDone);

// Agent: request unassignment from their current deal
router.patch('/:id/request-unassign', authorizeRoles('agent'), requestUnassignment);

// Agent: directly sell their own property
router.post('/direct-sell/:propertyId', authorizeRoles('agent'), directSellProperty);

// Admin: view all deals (filterable by status)
router.get('/', authorizeRoles('admin'), getAllDeals);

// Admin: approve a deal
router.patch('/:id/approve', authorizeRoles('admin'), approveDealValidation, validate, approveDeal);

// Admin or deal-owner Agent: view a single deal
router.get('/:id', getDealById);

module.exports = router;
