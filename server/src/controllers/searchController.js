'use strict';
const Property = require('../models/Property');
const Seller = require('../models/Seller');
const Buyer = require('../models/Buyer');
const Tenant = require('../models/Tenant');
const RentalProperty = require('../models/RentalProperty');

/**
 * GET /api/search/properties
 * Advanced property search with dynamic query building.
 */
const searchProperties = async (req, res, next) => {
  try {
    const {
      type, location, minBudget, maxBudget, minArea, maxArea,
      bhk, parking, status, purpose, sellerId, dateFrom, dateTo,
      page = 1, limit = 10,
    } = req.query;

    const filter = {};

    if (type) filter.propertyType = type;
    if (status) filter.propertyStatus = status;
    if (purpose) filter.purpose = purpose;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (bhk) filter.bhk = Number(bhk);
    if (parking !== undefined) filter.parkingAvailable = parking === 'true';

    if (minBudget || maxBudget) {
      filter.price = {};
      if (minBudget) filter.price.$gte = Number(minBudget);
      if (maxBudget) filter.price.$lte = Number(maxBudget);
    }

    if (minArea || maxArea) {
      filter.area = {};
      if (minArea) filter.area.$gte = Number(minArea);
      if (maxArea) filter.area.$lte = Number(maxArea);
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Filter by linked seller (look in Seller collection)
    if (sellerId) {
      const seller = await Seller.findById(sellerId).select('propertiesLinked');
      if (seller) {
        filter._id = { $in: seller.propertiesLinked };
      } else {
        // Seller not found — return empty result
        return res.status(200).json({
          success: true,
          message: 'No properties found',
          data: [],
          pagination: { total: 0, page: Number(page), limit: Number(limit), pages: 0 },
        });
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Properties search results',
      data: properties,
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
 * GET /api/search/buyers
 */
const searchBuyers = async (req, res, next) => {
  try {
    const {
      location, minBudget, maxBudget, bhk, parking, status,
      page = 1, limit = 10,
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (location) filter.preferredLocation = { $regex: location, $options: 'i' };
    if (bhk) filter.bhkRequirement = Number(bhk);
    if (parking) filter.parkingRequirement = parking;

    if (minBudget || maxBudget) {
      if (minBudget) filter.budgetMin = { $gte: Number(minBudget) };
      if (maxBudget) filter.budgetMax = { $lte: Number(maxBudget) };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Buyer.countDocuments(filter);
    const buyers = await Buyer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Buyers search results',
      data: buyers,
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
 * GET /api/search/tenants
 */
const searchTenants = async (req, res, next) => {
  try {
    const { location, maxBudget, bhk, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (location) filter.preferredLocation = { $regex: location, $options: 'i' };
    if (bhk) filter.bhkRequirement = Number(bhk);
    if (maxBudget) filter.budgetRange = { $lte: Number(maxBudget) };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Tenant.countDocuments(filter);
    const tenants = await Tenant.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Tenants search results',
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
 * GET /api/search/rentals
 */
const searchRentals = async (req, res, next) => {
  try {
    const { location, maxRent, bhk, furnishing, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (status) filter.propertyStatus = status;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (bhk) filter.bhk = Number(bhk);
    if (furnishing) filter.furnishing = furnishing;
    if (maxRent) filter.rentAmount = { $lte: Number(maxRent) };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await RentalProperty.countDocuments(filter);
    const rentals = await RentalProperty.find(filter)
      .populate('propertyRef')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Rentals search results',
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
 * GET /api/search/sellers
 */
const searchSellers = async (req, res, next) => {
  try {
    const { name, contactNumber, address, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (name) filter.sellerName = { $regex: name, $options: 'i' };
    if (contactNumber) filter.contactNumber = { $regex: contactNumber, $options: 'i' };
    if (address) filter.address = { $regex: address, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Seller.countDocuments(filter);
    const sellers = await Seller.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Sellers search results',
      data: sellers,
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

module.exports = { searchProperties, searchBuyers, searchTenants, searchRentals, searchSellers };
