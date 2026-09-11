'use strict';
const express = require('express');
const router = express.Router();
const { getAllReports, getReportById, exportAgentReports } = require('../controllers/reportController');
const { auth, authorizeRoles } = require('../middleware/auth');

// Both admins and agents can access reports (filtered by role in controller)
router.use(auth);

router.get('/', getAllReports);
router.get('/agents/:agentId/export', authorizeRoles('admin'), exportAgentReports);
router.get('/:id', getReportById);

module.exports = router;
