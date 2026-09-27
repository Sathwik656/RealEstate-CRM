'use strict';
const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const {
  requestUnassignment,
  handleUnassignmentRequest,
  reassignDeal,
  unallotDeal,
  getDealAssignmentHistory,
} = require('../controllers/reassignmentController');

router.use(auth);

// Agent: request to be unassigned from their current deal
// (Also registered in dealRoutes as PATCH /api/deals/:id/request-unassign for convenience)
router.patch('/:dealId/request-unassign', authorizeRoles('agent'), requestUnassignment);

// Admin: handle an unassignment request (keep / unassign / unassign+reassign)
router.patch('/:dealId/handle', authorizeRoles('admin'), handleUnassignmentRequest);

// Admin: directly reassign a deal to another interested agent
router.patch('/:dealId/reassign', authorizeRoles('admin'), reassignDeal);

// Admin: forcefully unallot a deal (remove current agent without replacement)
router.patch('/:dealId/unallot', authorizeRoles('admin'), unallotDeal);

// Admin: get full assignment history for a deal
router.get('/:dealId/history', authorizeRoles('admin'), getDealAssignmentHistory);

module.exports = router;
