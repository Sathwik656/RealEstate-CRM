'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * searchController.js  —  CRM hybrid search (MongoDB + Fuse.js)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Each handler follows the same three-step pattern:
 *
 *   1. Parse & validate query params (structured filters + optional ?q=).
 *   2. Build baseFilter — the narrowing conditions (createdByUserId, status, budget…).
 *   3. Call hybridSearch(Model, q, fuseKeys, mongoFields, baseFilter)
 *      which returns { results, total }.
 *
 * Endpoints:
 *   GET /api/search/properties
 *   GET /api/search/sellers
 *   GET /api/search/buyers
 *   GET /api/search/global
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Property       = require('../models/Property');
const Seller         = require('../models/Seller');
const Buyer          = require('../models/Buyer');
const SellerProperty = require('../models/SellerProperty');
const LocationCode   = require('../models/LocationCode');
const PropertyInterest = require('../models/PropertyInterest');

const { parsePage, parseLimit, buildPagination, FUSE_KEYS, MONGO_SEARCH_FIELDS } =
  require('../utils/searchHelper');

const { hybridSearch } = require('../utils/searchService');

// =============================================================================
// GET /api/search/properties
//
// Query params:
//   ?q=          — hybrid text search
//   ?type=       — exact match on propertyType
//   ?status=     — exact match on propertyStatus
//   ?purpose=    — exact match on purpose (Sale | Rent)
//   ?location=   — regex match on location (backwards compat)
//   ?bhk=        — numeric match
//   ?parking=    — boolean (true|false)
//   ?minBudget=  / ?maxBudget=
//   ?minArea=    / ?maxArea=
//   ?sellerId=   — restrict to properties linked to a specific seller (via SellerProperty)
//   ?dateFrom=   / ?dateTo=
//   ?page=       / ?limit=
// =============================================================================

const searchProperties = async (req, res, next) => {
  try {
    const {
      q,
      type, location, minBudget, maxBudget, minArea, maxArea,
      bhk, parking, status, purpose, sellerId, dateFrom, dateTo,
      page: rawPage = 1, limit: rawLimit = 10,
    } = req.query;

    const page  = parsePage(rawPage);
    const limit = parseLimit(rawLimit);

    const baseFilter = {};

    if (type)    baseFilter.propertyType   = type;
    if (status)  baseFilter.propertyStatus = status;
    if (purpose) baseFilter.purpose        = purpose;
    if (bhk)     baseFilter.bhk            = Number(bhk);

    if (parking !== undefined && parking !== '') {
      baseFilter.parkingAvailable = parking === 'true';
    }

    if (location && !q) {
      const locDocs = await LocationCode.find({
        $or: [
          { location: { $regex: location, $options: 'i' } },
          { code: { $regex: location, $options: 'i' } }
        ]
      }).select('_id');
      baseFilter.location = { $in: locDocs.map(d => d._id) };
    }

    if (minBudget || maxBudget) {
      baseFilter.price = {};
      if (minBudget) baseFilter.price.$gte = Number(minBudget);
      if (maxBudget) baseFilter.price.$lte = Number(maxBudget);
    }

    if (minArea || maxArea) {
      baseFilter.area = {};
      if (minArea) baseFilter.area.$gte = Number(minArea);
      if (maxArea) baseFilter.area.$lte = Number(maxArea);
    }

    if (dateFrom || dateTo) {
      baseFilter.createdAt = {};
      if (dateFrom) baseFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   baseFilter.createdAt.$lte = new Date(dateTo);
    }

    // ── sellerId: resolve linked property IDs via SellerProperty junction ──
    if (sellerId) {
      const links = await SellerProperty.find({ sellerId }).select('propertyId');
      if (!links.length) {
        return res.status(200).json({
          success: true,
          message: 'No properties found',
          data: [],
          pagination: buildPagination(0, page, limit),
        });
      }
      baseFilter._id = { $in: links.map((l) => l.propertyId) };
    }

    let extraOrClauses = [];
    if (q) {
      const locDocs = await LocationCode.find({
        $or: [
          { location: { $regex: q, $options: 'i' } },
          { code: { $regex: q, $options: 'i' } }
        ]
      }).select('_id');
      if (locDocs.length > 0) {
        extraOrClauses.push({ location: { $in: locDocs.map(d => d._id) } });
      }
    }

    const { results, total } = await hybridSearch(
      Property,
      q,
      FUSE_KEYS.property,
      MONGO_SEARCH_FIELDS.property,
      baseFilter,
      { populate: 'location', extraOrClauses }
    );

    const skip  = (page - 1) * limit;
    let paged = results.slice(skip, skip + limit);

    if (req.user.role === 'agent') {
      const interests = await PropertyInterest.find({
        agentId: req.user._id,
        propertyId: { $in: paged.map(p => p._id) }
      });
      const interestedIds = new Set(interests.map(i => i.propertyId.toString()));
      paged = paged.map(p => {
        const plainP = p.toObject ? p.toObject() : p;
        return {
          ...plainP,
          isApplied: interestedIds.has(plainP._id.toString())
        };
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Properties search results',
      data: paged,
      pagination: buildPagination(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/search/sellers
// =============================================================================

const searchSellers = async (req, res, next) => {
  try {
    const {
      q,
      name, contactNumber, address,
      page: rawPage = 1, limit: rawLimit = 10,
    } = req.query;

    const page  = parsePage(rawPage);
    const limit = parseLimit(rawLimit);

    const baseFilter = req.user.role === 'admin' ? {} : { referredByAgentId: req.user._id };

    if (!q) {
      if (name)          baseFilter.sellerName    = { $regex: name, $options: 'i' };
      if (contactNumber) baseFilter.contactNumber = { $regex: contactNumber, $options: 'i' };
      if (address)       baseFilter.address       = { $regex: address, $options: 'i' };
    }

    const { results, total } = await hybridSearch(
      Seller,
      q,
      FUSE_KEYS.seller,
      MONGO_SEARCH_FIELDS.seller,
      baseFilter,
    );

    const skip  = (page - 1) * limit;
    const paged = results.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      message: 'Sellers search results',
      data: paged,
      pagination: buildPagination(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/search/buyers
// =============================================================================

const searchBuyers = async (req, res, next) => {
  try {
    const {
      q,
      location, minBudget, maxBudget, bhk, parking, status,
      page: rawPage = 1, limit: rawLimit = 10,
    } = req.query;

    const page  = parsePage(rawPage);
    const limit = parseLimit(rawLimit);

    const baseFilter = req.user.role === 'admin' ? {} : { referredByAgentId: req.user._id };

    if (status)  baseFilter.status             = status;
    if (bhk)     baseFilter.bhkRequirement     = Number(bhk);
    if (parking) baseFilter.parkingRequirement = parking;

    if (location && !q) {
      baseFilter.preferredLocation = { $regex: location, $options: 'i' };
    }

    if (minBudget) baseFilter.budgetMin = { $gte: Number(minBudget) };
    if (maxBudget) baseFilter.budgetMax = { $lte: Number(maxBudget) };

    const { results, total } = await hybridSearch(
      Buyer,
      q,
      FUSE_KEYS.buyer,
      MONGO_SEARCH_FIELDS.buyer,
      baseFilter,
    );

    const skip  = (page - 1) * limit;
    const paged = results.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      message: 'Buyers search results',
      data: paged,
      pagination: buildPagination(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/search/global?q=<keyword>&limit=<n>
// =============================================================================

const searchGlobal = async (req, res, next) => {
  try {
    const { q, limit: rawLimit = 5 } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter ?q= is required for global search.',
      });
    }

    const limit = parseLimit(rawLimit);

    const propertyFilter = {};

    let propertyExtraOrClauses = [];
    if (q) {
      const locDocs = await LocationCode.find({
        $or: [
          { location: { $regex: q, $options: 'i' } },
          { code: { $regex: q, $options: 'i' } }
        ]
      }).select('_id');
      if (locDocs.length > 0) {
        propertyExtraOrClauses.push({ location: { $in: locDocs.map(d => d._id) } });
      }
    }

    const [
      { results: properties, total: propTotal   },
      { results: sellers,    total: sellerTotal  },
      { results: buyers,     total: buyerTotal   },
    ] = await Promise.all([
      hybridSearch(Property, q, FUSE_KEYS.property, MONGO_SEARCH_FIELDS.property, propertyFilter, { maxResults: limit, populate: 'location', extraOrClauses: propertyExtraOrClauses }),
      hybridSearch(Seller, q, FUSE_KEYS.seller, MONGO_SEARCH_FIELDS.seller, req.user.role === 'admin' ? {} : { referredByAgentId: req.user._id }, { maxResults: limit }),
      hybridSearch(Buyer, q, FUSE_KEYS.buyer, MONGO_SEARCH_FIELDS.buyer, req.user.role === 'admin' ? {} : { referredByAgentId: req.user._id }, { maxResults: limit }),
    ]);

    return res.status(200).json({
      success: true,
      message: `Global search results for "${q.trim()}"`,
      data: { properties, sellers, buyers },
      meta: {
        query  : q.trim(),
        limit,
        totals : {
          properties : propTotal,
          sellers    : sellerTotal,
          buyers     : buyerTotal,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  searchProperties,
  searchSellers,
  searchBuyers,
  searchGlobal,
};
