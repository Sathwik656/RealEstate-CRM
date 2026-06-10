'use strict';
const express = require('express');
const router = express.Router();
const {
  getAllProperties, getPropertyStats, getPropertyById,
  createProperty, updateProperty, deleteProperty,
  updatePropertyStatus, propertyValidation,
} = require('../controllers/propertyController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// All property routes require authentication
router.use(auth);

// IMPORTANT: Specific routes before parameterized routes
router.get('/stats', getPropertyStats);
router.get('/', getAllProperties);
router.get('/:id', getPropertyById);
router.post('/', propertyValidation, validate, createProperty);
router.put('/:id', updateProperty);
router.delete('/:id', deleteProperty);
router.patch('/:id/status', updatePropertyStatus);

module.exports = router;
