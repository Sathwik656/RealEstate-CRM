'use strict';
const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, locationValidation } = require('../controllers/locationController');
const { auth, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All endpoints require authentication
router.use(auth);

// Any authenticated user can read (for dropdowns etc.)
router.get('/', getAll);
router.get('/:id', getById);

// Only admins can mutate
router.post('/', authorizeRoles('admin'), locationValidation, validate, create);
router.put('/:id', authorizeRoles('admin'), locationValidation, validate, update);
router.delete('/:id', authorizeRoles('admin'), remove);

module.exports = router;
