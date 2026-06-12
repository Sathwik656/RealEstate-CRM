'use strict';
const { body } = require('express-validator');
const Lease = require('../models/Lease');
const Property = require('../models/Property');
const { generateId } = require('../utils/generateId');

// ─── Validation Rules ─────────────────────────────────────────────────────────

const leaseValidation = [
  body('propertyRef').notEmpty().withMessage('Property reference is required'),
  body('landlordName').trim().notEmpty().withMessage('Landlord name is required'),
  body('leaseStartDate').isISO8601().withMessage('Lease start date must be a valid date'),
  body('leaseEndDate').isISO8601().withMessage('Lease end date must be a valid date'),
  body('leaseAmount').isNumeric().withMessage('Lease amount must be a number'),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/leases
 */
const getAllLeases = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, propertyRef } = req.query;
    const filter = { createdBy: req.user._id };

    if (status) filter.status = status;
    if (propertyRef) filter.propertyRef = propertyRef;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Lease.countDocuments(filter);
    const leases = await Lease.find(filter)
      .populate('propertyRef')
      .populate('tenantRef')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Leases fetched successfully',
      data: leases,
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
 * GET /api/leases/expiring
 * Get leases expiring within the next 30 days.
 */
const getExpiringLeases = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const leases = await Lease.find({
      createdBy: req.user._id,
      status: 'Active',
      leaseEndDate: { $gte: now, $lte: thirtyDaysFromNow },
    })
      .populate('propertyRef')
      .populate('tenantRef')
      .sort({ leaseEndDate: 1 });

    return res.status(200).json({
      success: true,
      message: 'Expiring leases fetched successfully',
      data: leases,
      pagination: { total: leases.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leases/:id
 * Populate propertyRef and tenantRef.
 */
const getLeaseById = async (req, res, next) => {
  try {
    const lease = await Lease.findOne({ _id: req.params.id, createdBy: req.user._id })
      .populate('propertyRef')
      .populate('tenantRef');

    if (!lease) {
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Lease fetched successfully',
      data: lease,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/leases
 * Creates lease with optional file upload for agreementDocument.
 * Auto-updates the linked Property status to "Leased".
 */
const createLease = async (req, res, next) => {
  try {
    const leaseId = generateId('LEA');
    const leaseData = { ...req.body, leaseId, createdBy: req.user._id };

    // Attach uploaded agreement document path if provided
    if (req.file) {
      leaseData.agreementDocument = req.file.path;
    }

    const lease = await Lease.create(leaseData);

    // Auto-update linked Property's status to "Leased"
    if (lease.propertyRef) {
      await Property.findOneAndUpdate(
        { _id: lease.propertyRef, createdBy: req.user._id },
        { propertyStatus: 'Leased' }
      );
    }

    await lease.populate(['propertyRef', 'tenantRef']);

    return res.status(201).json({
      success: true,
      message: 'Lease created successfully',
      data: lease,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/leases/:id
 */
const updateLease = async (req, res, next) => {
  try {
    delete req.body.leaseId;

    if (req.file) {
      req.body.agreementDocument = req.file.path;
    }

    const lease = await Lease.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      {
      new: true,
      runValidators: true,
    })
      .populate('propertyRef')
      .populate('tenantRef');

    if (!lease) {
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Lease updated successfully',
      data: lease,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/leases/:id
 */
const deleteLease = async (req, res, next) => {
  try {
    const lease = await Lease.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });

    if (!lease) {
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Lease deleted successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/leases/:id/status
 */
const updateLeaseStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Active', 'Expired', 'Renewed'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const lease = await Lease.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    )
      .populate('propertyRef')
      .populate('tenantRef');

    if (!lease) {
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Lease status updated successfully',
      data: lease,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllLeases,
  getExpiringLeases,
  getLeaseById,
  createLease,
  updateLease,
  deleteLease,
  updateLeaseStatus,
  leaseValidation,
};
