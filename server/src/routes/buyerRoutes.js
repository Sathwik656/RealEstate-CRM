'use strict';
const express = require('express');
const router = express.Router();
const {
  getAllBuyers, getBuyerFollowUps, getBuyerById,
  createBuyer, updateBuyer, deleteBuyer,
  updateBuyerStatus, buyerValidation,
} = require('../controllers/buyerController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(auth);

// IMPORTANT: /followups before /:id to avoid route collision
router.get('/followups', getBuyerFollowUps);
router.get('/', getAllBuyers);
router.get('/:id', getBuyerById);
router.post('/', buyerValidation, validate, createBuyer);
router.put('/:id', updateBuyer);
router.delete('/:id', deleteBuyer);
router.patch('/:id/status', updateBuyerStatus);

module.exports = router;
