'use strict';
const express = require('express');
const router = express.Router();
const {
  getAllProperties, getMyProperties, exportProperties, getPropertyStats, getPropertyById,
  createProperty, updateProperty, deleteProperty,
  updatePropertyStatus, approveProperty, propertyValidation,
} = require('../controllers/propertyController');
const { auth, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All property routes require authentication
router.use(auth);

// IMPORTANT: Specific routes before parameterized routes
router.get('/stats', getPropertyStats);
router.get('/export', exportProperties);
router.get('/my', getMyProperties);                         // Agent's own properties (all statuses)
router.get('/', getAllProperties);
router.get('/:id', getPropertyById);
router.get('/:id/interests', require('../controllers/propertyController').getPropertyInterests);
router.post('/', propertyValidation, validate, createProperty);  // Agents + Admins can create
router.put('/:id', updateProperty);
router.delete('/:id', deleteProperty);
router.patch('/:id/status', updatePropertyStatus);
router.patch('/:id/approve', authorizeRoles('admin'), approveProperty); // Admin only

module.exports = router;
