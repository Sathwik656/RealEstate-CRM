'use strict';
const { body } = require('express-validator');
const LocationCode = require('../models/LocationCode');
const Property = require('../models/Property');

// ─── Validation Rules ─────────────────────────────────────────────────────────

const locationValidation = [
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location name is required')
    .isLength({ max: 100 })
    .withMessage('Location name is too long'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Location code is required')
    .isLength({ max: 10 })
    .withMessage('Code cannot be more than 10 characters')
    .toUpperCase(),
];

// ─── GET /api/locations ───────────────────────────────────────────────────────

const getAll = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (q && q.trim()) {
      filter.$or = [
        { location: { $regex: q.trim(), $options: 'i' } },
        { code: { $regex: q.trim(), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [locations, total] = await Promise.all([
      LocationCode.find(filter).sort({ location: 1 }).skip(skip).limit(Number(limit)),
      LocationCode.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Locations fetched successfully',
      data: locations,
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

// ─── GET /api/locations/:id ───────────────────────────────────────────────────

const getById = async (req, res, next) => {
  try {
    const location = await LocationCode.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    return res.status(200).json({ success: true, data: location });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/locations ──────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const { location, code } = req.body;
    const upperCode = code.toUpperCase().trim();
    const trimmedLocation = location.trim();

    // Check for duplicate location name
    const existingByName = await LocationCode.findOne({ location: { $regex: `^${trimmedLocation}$`, $options: 'i' } });
    if (existingByName) {
      return res.status(400).json({ success: false, message: `Location "${trimmedLocation}" already exists.` });
    }

    // Check for duplicate code
    const existingByCode = await LocationCode.findOne({ code: upperCode });
    if (existingByCode) {
      return res.status(400).json({ success: false, message: `Code "${upperCode}" is already used by "${existingByCode.location}".` });
    }

    const newLocation = await LocationCode.create({ location: trimmedLocation, code: upperCode });
    return res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: newLocation,
    });
  } catch (err) {
    if (err.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0];
      return res.status(400).json({ success: false, message: `Duplicate value for ${key}. Please use a unique location name and code.` });
    }
    next(err);
  }
};

// ─── PUT /api/locations/:id ───────────────────────────────────────────────────

const update = async (req, res, next) => {
  try {
    const { location, code } = req.body;
    const upperCode = code ? code.toUpperCase().trim() : undefined;
    const trimmedLocation = location ? location.trim() : undefined;

    // Check duplicates excluding self
    if (trimmedLocation) {
      const existingByName = await LocationCode.findOne({
        location: { $regex: `^${trimmedLocation}$`, $options: 'i' },
        _id: { $ne: req.params.id },
      });
      if (existingByName) {
        return res.status(400).json({ success: false, message: `Location "${trimmedLocation}" already exists.` });
      }
    }

    if (upperCode) {
      const existingByCode = await LocationCode.findOne({
        code: upperCode,
        _id: { $ne: req.params.id },
      });
      if (existingByCode) {
        return res.status(400).json({ success: false, message: `Code "${upperCode}" is already used by "${existingByCode.location}".` });
      }
    }

    const oldLocationDoc = await LocationCode.findById(req.params.id);
    if (!oldLocationDoc) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    const oldCode = oldLocationDoc.code;

    const updated = await LocationCode.findByIdAndUpdate(
      req.params.id,
      { ...(trimmedLocation && { location: trimmedLocation }), ...(upperCode && { code: upperCode }) },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    // Update property codes if the location code changed
    if (upperCode && upperCode !== oldCode) {
      const properties = await Property.find({ location: req.params.id });
      const bulkOps = properties
        .filter(p => p.code && p.code.includes(`-${oldCode}-`))
        .map(p => ({
          updateOne: {
            filter: { _id: p._id },
            update: { $set: { code: p.code.replace(`-${oldCode}-`, `-${upperCode}-`) } }
          }
        }));

      if (bulkOps.length > 0) {
        await Property.bulkWrite(bulkOps);
      }
    }

    return res.status(200).json({ success: true, message: 'Location updated successfully', data: updated });
  } catch (err) {
    if (err.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0];
      return res.status(400).json({ success: false, message: `Duplicate value for ${key}.` });
    }
    next(err);
  }
};

// ─── DELETE /api/locations/:id ────────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const deleted = await LocationCode.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    return res.status(200).json({ success: true, message: 'Location deleted successfully', data: null });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove, locationValidation };
