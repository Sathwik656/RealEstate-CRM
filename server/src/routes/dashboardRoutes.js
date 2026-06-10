'use strict';
const express = require('express');
const router = express.Router();
const { getDashboardStats, getDashboardCharts } = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/stats', getDashboardStats);
router.get('/charts', getDashboardCharts);

module.exports = router;
