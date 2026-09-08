'use strict';
const express = require('express');
const router = express.Router();
const {
  getAllAgents,
  updateAgent,
  deleteAgent,
} = require('../controllers/userController');
const { auth, authorizeRoles } = require('../middleware/auth');

// Protect all user routes - must be logged in and an admin
router.use(auth);
router.use(authorizeRoles('admin'));

// Agent Management Routes
router.get('/agents', getAllAgents);
router.put('/agents/:id', updateAgent);
router.delete('/agents/:id', deleteAgent);

module.exports = router;
