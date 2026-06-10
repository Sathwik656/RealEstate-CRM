'use strict';
const express = require('express');
const router = express.Router();
const {
  getAllLeases, getExpiringLeases, getLeaseById,
  createLease, updateLease, deleteLease,
  updateLeaseStatus, leaseValidation,
} = require('../controllers/leaseController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');

router.use(auth);

// IMPORTANT: /expiring before /:id to avoid route collision
router.get('/expiring', getExpiringLeases);
router.get('/', getAllLeases);
router.get('/:id', getLeaseById);
// File upload middleware on create and update only
router.post('/', upload.single('agreementDocument'), leaseValidation, validate, createLease);
router.put('/:id', upload.single('agreementDocument'), updateLease);
router.delete('/:id', deleteLease);
router.patch('/:id/status', updateLeaseStatus);

module.exports = router;
