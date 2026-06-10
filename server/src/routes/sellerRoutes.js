'use strict';
const express = require('express');
const router = express.Router();
const {
  getAllSellers, getSellerById, createSeller,
  updateSeller, deleteSeller, linkProperty, unlinkProperty,
  sellerValidation,
} = require('../controllers/sellerController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(auth);

router.get('/', getAllSellers);
router.get('/:id', getSellerById);
router.post('/', sellerValidation, validate, createSeller);
router.put('/:id', updateSeller);
router.delete('/:id', deleteSeller);
router.post('/:id/link-property', linkProperty);
router.delete('/:id/unlink-property/:propertyId', unlinkProperty);

module.exports = router;
