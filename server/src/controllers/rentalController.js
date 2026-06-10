'use strict';
const { body } = require('express-validator');
const RentalProperty = require('../models/RentalProperty');
const Property = require('../models/Property');

// ─── Validation Rules ─────────────────────────────────────────────────────────

const rentalValidation = [
  body('propertyRef').notEmpty().withMessage('Property reference is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('rentAmount').isNumeric().withMessage('Rent amount must be a number'),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/rentals
 */
const getAllRentals = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, location, bhk, furnishing } = req.query;
    const filter = {};

    if (status) filter.propertyStatus = status;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (bhk) filter.bhk = Number(bhk);
    if (furnishing) filter.furnishing = furnishing;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await RentalProperty.countDocuments(filter);
    const rentals = await RentalProperty.find(filter)
      .populate('propertyRef')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Rental properties fetched successfully',
      data: rentals,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rentals/:id
 * Populate propertyRef.
 */
const getRentalById = async (req, res, next) => {
  try {
    const rental = await RentalProperty.findById(req.params.id).populate('propertyRef');

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental property not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Rental property fetched successfully',
      data: rental,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/rentals
 * Creates rental and links back to Property.
 */
const createRental = async (req, res, next) => {
  try {
    const rental = await RentalProperty.create(req.body);
    await rental.populate('propertyRef');

    return res.status(201).json({
      success: true,
      message: 'Rental property created successfully',
      data: rental,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/rentals/:id
 */
const updateRental = async (req, res, next) => {
  try {
    const rental = await RentalProperty.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('propertyRef');

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental property not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Rental property updated successfully',
      data: rental,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/rentals/:id
 */
const deleteRental = async (req, res, next) => {
  try {
    const rental = await RentalProperty.findByIdAndDelete(req.params.id);

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental property not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Rental property deleted successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/rentals/:id/status
 * Toggle Available/Occupied and update linked Property status accordingly.
 */
const updateRentalStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Available', 'Occupied'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either Available or Occupied',
      });
    }

    const rental = await RentalProperty.findByIdAndUpdate(
      req.params.id,
      { propertyStatus: status },
      { new: true, runValidators: true }
    ).populate('propertyRef');

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental property not found' });
    }

    // Auto-update linked Property status
    if (rental.propertyRef) {
      const newPropertyStatus = status === 'Occupied' ? 'Rented' : 'Available';
      await Property.findByIdAndUpdate(rental.propertyRef._id, {
        propertyStatus: newPropertyStatus,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Rental status updated to ${status}`,
      data: rental,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllRentals,
  getRentalById,
  createRental,
  updateRental,
  deleteRental,
  updateRentalStatus,
  rentalValidation,
};
