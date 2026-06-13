'use strict';
const { body } = require('express-validator');
const Tenant = require('../models/Tenant');
const { generateId } = require('../utils/generateId');

// ─── Validation Rules ─────────────────────────────────────────────────────────

const tenantValidation = [
  body('tenantName').trim().notEmpty().withMessage('Tenant name is required'),
  body('contactNumber').trim().notEmpty().withMessage('Contact number is required'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('note').optional().trim(),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/tenants
 */
const getAllTenants = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const filter = { createdBy: req.user._id };

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { tenantName: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Tenant.countDocuments(filter);
    const tenants = await Tenant.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Tenants fetched successfully',
      data: tenants,
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
 * GET /api/tenants/:id
 */
const getTenantById = async (req, res, next) => {
  try {
    const tenant = await Tenant.findOne({ _id: req.params.id, createdBy: req.user._id });

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Tenant fetched successfully',
      data: tenant,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tenants
 */
const createTenant = async (req, res, next) => {
  try {
    const tenantId = generateId('TEN');
    const tenant = await Tenant.create({ ...req.body, tenantId, createdBy: req.user._id });

    return res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: tenant,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/tenants/:id
 */
const updateTenant = async (req, res, next) => {
  try {
    delete req.body.tenantId;

    const tenant = await Tenant.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      {
      new: true,
      runValidators: true,
    });

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Tenant updated successfully',
      data: tenant,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/tenants/:id
 */
const deleteTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Tenant deleted successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tenants/:id/status
 * Activate or Deactivate a tenant.
 */
const updateTenantStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Active', 'Inactive'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either Active or Inactive',
      });
    }

    const tenant = await Tenant.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Tenant ${status === 'Active' ? 'activated' : 'deactivated'} successfully`,
      data: tenant,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  updateTenantStatus,
  tenantValidation,
};
