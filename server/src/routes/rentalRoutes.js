'use strict';
const express = require('express');
const router = express.Router();
const {
  getAllRentals, getRentalById, createRental,
  updateRental, deleteRental, updateRentalStatus,
  rentalValidation,
} = require('../controllers/rentalController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(auth);

router.get('/', getAllRentals);
router.get('/:id', getRentalById);
router.post('/', rentalValidation, validate, createRental);
router.put('/:id', updateRental);
router.delete('/:id', deleteRental);
router.patch('/:id/status', updateRentalStatus);

module.exports = router;
