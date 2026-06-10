'use strict';
const express = require('express');
const router = express.Router();
const {
  getAllTenants, getTenantById, createTenant,
  updateTenant, deleteTenant, updateTenantStatus,
  tenantValidation,
} = require('../controllers/tenantController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(auth);

router.get('/', getAllTenants);
router.get('/:id', getTenantById);
router.post('/', tenantValidation, validate, createTenant);
router.put('/:id', updateTenant);
router.delete('/:id', deleteTenant);
router.patch('/:id/status', updateTenantStatus);

module.exports = router;
