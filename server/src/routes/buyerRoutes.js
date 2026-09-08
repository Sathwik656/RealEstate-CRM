'use strict';
const express = require('express');
const router = express.Router();
const {
  getAllBuyers, getBuyerById,
  createBuyer, updateBuyer, deleteBuyer,
  updateBuyerStatus, buyerValidation,
} = require('../controllers/buyerController');
const { auth, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(auth);

router.get('/', getAllBuyers);
router.get('/:id', getBuyerById);
router.post('/', buyerValidation, validate, createBuyer);
router.put('/:id', updateBuyer);
router.delete('/:id', deleteBuyer);
router.patch('/:id/status', updateBuyerStatus);

module.exports = router;
