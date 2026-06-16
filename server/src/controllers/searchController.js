'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * searchController.js  —  CRM hybrid search (MongoDB + Fuse.js)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Each handler follows the same three-step pattern:
 *
 *   1. Parse & validate query params (structured filters + optional ?q=).
 *   2. Build baseFilter — the narrowing conditions (createdBy, status, budget…).
 *      These are passed straight to hybridSearch which applies them at the
 *      MongoDB candidate-retrieval stage, so they are always respected.
 *   3. Call hybridSearch(Model, q, fuseKeys, mongoFields, baseFilter)
 *      which returns { results, total }.
 *      Controllers then apply pagination by slicing the results array.
 *
 * API contract:
 *   Routes, URL params, and response shapes are UNCHANGED from the previous
 *   pure-regex implementation. The frontend requires no modifications.
 *
 * Endpoints:
 *   GET /api/search/properties
 *   GET /api/search/sellers
 *   GET /api/search/buyers
 *   GET /api/search/tenants
 *   GET /api/search/rentals
 *   GET /api/search/global       ← all collections, Promise.all
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Property       = require('../models/Property');
const Seller         = require('../models/Seller');
const Buyer          = require('../models/Buyer');
const Tenant         = require('../models/Tenant');
const RentalProperty = require('../models/RentalProperty');

const { parsePage, parseLimit, buildPagination, FUSE_KEYS, MONGO_SEARCH_FIELDS } =
  require('../utils/searchHelper');

const { hybridSearch } = require('../utils/searchService');

// =============================================================================
// GET /api/search/properties
//
// Query params:
//   ?q=          — hybrid text search across: propertyTitle, propertyType,
//                  purpose, location, landmark, address, propertyDescription,
//                  ownerName (regex stage) + Fuse.js fuzzy ranking
//   ?type=       — exact match on propertyType
//   ?status=     — exact match on propertyStatus
//   ?purpose=    — exact match on purpose (Sale | Rent | Lease)
//   ?location=   — regex match on location  (kept for backwards compat)
//   ?bhk=        — numeric match
//   ?parking=    — boolean (true|false)
//   ?minBudget=  / ?maxBudget=
//   ?minArea=    / ?maxArea=
//   ?sellerId=   — restrict to properties linked to a specific seller
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

    // ── Build structured (narrowing) filter ───────────────────────────────
    const baseFilter = { createdBy: req.user._id };

    if (type)    baseFilter.propertyType   = type;
    if (status)  baseFilter.propertyStatus = status;
    if (purpose) baseFilter.purpose        = purpose;
    if (bhk)     baseFilter.bhk            = Number(bhk);

    if (parking !== undefined && parking !== '') {
      baseFilter.parkingAvailable = parking === 'true';
    }

    // When ?q= is present it already searches location via fuzzy stage.
    // When only the legacy ?location= filter is used (no ?q=), preserve it.
    if (location && !q) {
      baseFilter.location = { $regex: location, $options: 'i' };
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

    // ── sellerId: resolve linked property IDs (business logic) ───────────
    if (sellerId) {
      const seller = await Seller.findById(sellerId).select('propertiesLinked');
      if (!seller) {
        return res.status(200).json({
          success: true,
          message: 'No properties found',
          data: [],
          pagination: buildPagination(0, page, limit),
        });
      }
      baseFilter._id = { $in: seller.propertiesLinked };
    }

    // ── Hybrid search: MongoDB candidates → Fuse.js ranking ───────────────
    const { results, total } = await hybridSearch(
      Property,
      q,
      FUSE_KEYS.property,
      MONGO_SEARCH_FIELDS.property,
      baseFilter,
    );

    // Paginate in-memory (Fuse results are already ranked)
    const skip  = (page - 1) * limit;
    const paged = results.slice(skip, skip + limit);

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
//
// Query params:
//   ?q=             — hybrid text search across: sellerName, contactNumber,
//                     address, note
//   ?name=          — regex on sellerName    (backwards compat)
//   ?contactNumber= — regex on contactNumber (backwards compat)
//   ?address=       — regex on address       (backwards compat)
//   ?page= / ?limit=
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

    // ── Build structured filter (backwards-compatible individual fields) ───
    const baseFilter = { createdBy: req.user._id };

    // Legacy single-field params still work when ?q= is not supplied
    if (!q) {
      if (name)          baseFilter.sellerName    = { $regex: name, $options: 'i' };
      if (contactNumber) baseFilter.contactNumber = { $regex: contactNumber, $options: 'i' };
      if (address)       baseFilter.address       = { $regex: address, $options: 'i' };
    }

    // ── Hybrid search ─────────────────────────────────────────────────────
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
//
// Query params:
//   ?q=          — hybrid text search across: buyerName, contactNumber,
//                  preferredLocation, address, landmarkPreference, remarks, note
//   ?location=   — regex on preferredLocation (backwards compat, used when no ?q=)
//   ?status=     — exact match on status
//   ?bhk=        — numeric match on bhkRequirement
//   ?parking=    — exact match on parkingRequirement
//   ?minBudget=  / ?maxBudget=
//   ?page= / ?limit=
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

    const baseFilter = { createdBy: req.user._id };

    if (status)  baseFilter.status            = status;
    if (bhk)     baseFilter.bhkRequirement    = Number(bhk);
    if (parking) baseFilter.parkingRequirement = parking;

    if (location && !q) {
      baseFilter.preferredLocation = { $regex: location, $options: 'i' };
    }

    if (minBudget) baseFilter.budgetMin = { $gte: Number(minBudget) };
    if (maxBudget) baseFilter.budgetMax = { $lte: Number(maxBudget) };

    // ── Hybrid search ─────────────────────────────────────────────────────
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
// GET /api/search/tenants
//
// Query params:
//   ?q=          — hybrid text search across: tenantName, contactNumber,
//                  preferredLocation, occupation, companyName, email, remarks, note
//   ?location=   — regex on preferredLocation (backwards compat, used when no ?q=)
//   ?status=     — exact match on status
//   ?bhk=        — numeric match on bhkRequirement
//   ?maxBudget=  — upper bound on budgetRange
//   ?page= / ?limit=
// =============================================================================

const searchTenants = async (req, res, next) => {
  try {
    const {
      q,
      location, maxBudget, bhk, status,
      page: rawPage = 1, limit: rawLimit = 10,
    } = req.query;

    const page  = parsePage(rawPage);
    const limit = parseLimit(rawLimit);

    const baseFilter = { createdBy: req.user._id };

    if (status)    baseFilter.status         = status;
    if (bhk)       baseFilter.bhkRequirement = Number(bhk);
    if (maxBudget) baseFilter.budgetRange     = { $lte: Number(maxBudget) };

    if (location && !q) {
      baseFilter.preferredLocation = { $regex: location, $options: 'i' };
    }

    // ── Hybrid search ─────────────────────────────────────────────────────
    const { results, total } = await hybridSearch(
      Tenant,
      q,
      FUSE_KEYS.tenant,
      MONGO_SEARCH_FIELDS.tenant,
      baseFilter,
    );

    const skip  = (page - 1) * limit;
    const paged = results.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      message: 'Tenants search results',
      data: paged,
      pagination: buildPagination(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/search/rentals
//
// Query params:
//   ?q=          — hybrid text search across: location, furnishing (_bhkStr)
//   ?location=   — regex on location (backwards compat, used when no ?q=)
//   ?status=     — exact match on propertyStatus
//   ?bhk=        — numeric match
//   ?furnishing= — exact match on furnishing enum
//   ?maxRent=    — upper bound on rentAmount
//   ?page= / ?limit=
// =============================================================================

const searchRentals = async (req, res, next) => {
  try {
    const {
      q,
      location, maxRent, bhk, furnishing, status,
      page: rawPage = 1, limit: rawLimit = 10,
    } = req.query;

    const page  = parsePage(rawPage);
    const limit = parseLimit(rawLimit);

    const baseFilter = { createdBy: req.user._id };

    if (status)    baseFilter.propertyStatus = status;
    if (bhk)       baseFilter.bhk            = Number(bhk);
    if (furnishing) baseFilter.furnishing     = furnishing;
    if (maxRent)   baseFilter.rentAmount      = { $lte: Number(maxRent) };

    if (location && !q) {
      baseFilter.location = { $regex: location, $options: 'i' };
    }

    // ── Hybrid search (with propertyRef populate) ──────────────────────────
    const { results, total } = await hybridSearch(
      RentalProperty,
      q,
      FUSE_KEYS.rental,
      MONGO_SEARCH_FIELDS.rental,
      baseFilter,
      { populate: 'propertyRef' },
    );

    const skip  = (page - 1) * limit;
    const paged = results.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      message: 'Rentals search results',
      data: paged,
      pagination: buildPagination(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/search/global?q=<keyword>&limit=<n>
//
// Searches ALL five collections simultaneously using Promise.all.
// Designed for the top-bar / header search bar of the CRM frontend.
//
// Query params:
//   ?q=      (required) — the search keyword
//   ?limit=  (optional, default 5) — max results per collection
//
// Response shape:
//   {
//     success: true,
//     message: "Global search results for \"sem\"",
//     data: {
//       properties : [ ... ],
//       sellers    : [ ... ],
//       buyers     : [ ... ],
//       tenants    : [ ... ],
//       rentals    : [ ... ],
//     },
//     meta: {
//       query  : "sem",
//       limit  : 5,
//       totals : { properties: 3, sellers: 1, ... }
//     }
//   }
//
// All 5 hybridSearch calls run in parallel via Promise.all so total latency
// ≈ slowest single query (not the sum of all five).
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

    const limit     = parseLimit(rawLimit);
    const userFilter = { createdBy: req.user._id };

    // Run all 5 collections in parallel — each hybrid call is independent
    const [
      { results: properties, total: propTotal   },
      { results: sellers,    total: sellerTotal  },
      { results: buyers,     total: buyerTotal   },
      { results: tenants,    total: tenantTotal  },
      { results: rentals,    total: rentalTotal  },
    ] = await Promise.all([
      hybridSearch(Property,       q, FUSE_KEYS.property, MONGO_SEARCH_FIELDS.property, userFilter, { maxResults: limit }),
      hybridSearch(Seller,         q, FUSE_KEYS.seller,   MONGO_SEARCH_FIELDS.seller,   userFilter, { maxResults: limit }),
      hybridSearch(Buyer,          q, FUSE_KEYS.buyer,    MONGO_SEARCH_FIELDS.buyer,    userFilter, { maxResults: limit }),
      hybridSearch(Tenant,         q, FUSE_KEYS.tenant,   MONGO_SEARCH_FIELDS.tenant,   userFilter, { maxResults: limit }),
      hybridSearch(RentalProperty, q, FUSE_KEYS.rental,   MONGO_SEARCH_FIELDS.rental,   userFilter, { maxResults: limit, populate: 'propertyRef' }),
    ]);

    return res.status(200).json({
      success: true,
      message: `Global search results for "${q.trim()}"`,
      data: {
        properties,
        sellers,
        buyers,
        tenants,
        rentals,
      },
      meta: {
        query  : q.trim(),
        limit,
        totals : {
          properties : propTotal,
          sellers    : sellerTotal,
          buyers     : buyerTotal,
          tenants    : tenantTotal,
          rentals    : rentalTotal,
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
  searchTenants,
  searchRentals,
  searchGlobal,
};
