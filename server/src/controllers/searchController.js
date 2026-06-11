'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * searchController.js  —  CRM-style multi-field regex search
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every handler supports two complementary modes that work together:
 *
 *   ?q=<term>       Global text search — uses $or across all relevant string
 *                   fields for that collection (partial / case-insensitive).
 *
 *   ?status=&bhk=   Structured filters — numeric, enum, date, range params.
 *                   These AND with the text search to narrow results further.
 *
 * When both are supplied the query becomes:
 *   { status: 'Active', bhk: 2, $or: [{ location: /sem/i }, ...] }
 *   ← narrow by structured filters ──────→ ← expand text match →
 *
 * Endpoints:
 *   GET /api/search/properties
 *   GET /api/search/sellers
 *   GET /api/search/buyers
 *   GET /api/search/tenants
 *   GET /api/search/rentals
 *   GET /api/search/global       ← NEW: all collections, Promise.all
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Property       = require('../models/Property');
const Seller         = require('../models/Seller');
const Buyer          = require('../models/Buyer');
const Tenant         = require('../models/Tenant');
const RentalProperty = require('../models/RentalProperty');

const {
  SEARCH_FIELDS,
  buildSearchFilter,
  parsePage,
  parseLimit,
  buildPagination,
} = require('../utils/searchHelper');

// =============================================================================
// GET /api/search/properties
//
// Query params:
//   ?q=          — text search across: propertyTitle, propertyType, purpose,
//                  location, landmark, address, propertyDescription, ownerName
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
    const baseFilter = {};

    if (type)    baseFilter.propertyType   = type;
    if (status)  baseFilter.propertyStatus = status;
    if (purpose) baseFilter.purpose        = purpose;
    if (bhk)     baseFilter.bhk            = Number(bhk);

    if (parking !== undefined && parking !== '') {
      baseFilter.parkingAvailable = parking === 'true';
    }

    // When ?q= is present it already searches location via $or.
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

    // ── Merge text search ($or) with structured filter ────────────────────
    const filter = buildSearchFilter(q, SEARCH_FIELDS.property, baseFilter);

    // ── Execute ───────────────────────────────────────────────────────────
    const skip  = (page - 1) * limit;
    const [total, properties] = await Promise.all([
      Property.countDocuments(filter),
      Property.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Properties search results',
      data: properties,
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
//   ?q=             — text search across: sellerName, contactNumber, address
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
    const baseFilter = {};

    // These legacy single-field params still work when ?q= is not supplied
    if (!q) {
      if (name)          baseFilter.sellerName    = { $regex: name, $options: 'i' };
      if (contactNumber) baseFilter.contactNumber = { $regex: contactNumber, $options: 'i' };
      if (address)       baseFilter.address       = { $regex: address, $options: 'i' };
    }

    // ── Merge with text search ────────────────────────────────────────────
    const filter = buildSearchFilter(q, SEARCH_FIELDS.seller, baseFilter);

    const skip  = (page - 1) * limit;
    const [total, sellers] = await Promise.all([
      Seller.countDocuments(filter),
      Seller.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Sellers search results',
      data: sellers,
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
//   ?q=          — text search across: buyerName, contactNumber,
//                  preferredLocation, address, landmarkPreference
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

    const baseFilter = {};

    if (status)  baseFilter.status           = status;
    if (bhk)     baseFilter.bhkRequirement   = Number(bhk);
    if (parking) baseFilter.parkingRequirement = parking;

    if (location && !q) {
      baseFilter.preferredLocation = { $regex: location, $options: 'i' };
    }

    if (minBudget) baseFilter.budgetMin = { $gte: Number(minBudget) };
    if (maxBudget) baseFilter.budgetMax = { $lte: Number(maxBudget) };

    const filter = buildSearchFilter(q, SEARCH_FIELDS.buyer, baseFilter);

    const skip  = (page - 1) * limit;
    const [total, buyers] = await Promise.all([
      Buyer.countDocuments(filter),
      Buyer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Buyers search results',
      data: buyers,
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
//   ?q=          — text search across: tenantName, contactNumber,
//                  preferredLocation, occupation, companyName, email
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

    const baseFilter = {};

    if (status)    baseFilter.status         = status;
    if (bhk)       baseFilter.bhkRequirement = Number(bhk);
    if (maxBudget) baseFilter.budgetRange     = { $lte: Number(maxBudget) };

    if (location && !q) {
      baseFilter.preferredLocation = { $regex: location, $options: 'i' };
    }

    const filter = buildSearchFilter(q, SEARCH_FIELDS.tenant, baseFilter);

    const skip  = (page - 1) * limit;
    const [total, tenants] = await Promise.all([
      Tenant.countDocuments(filter),
      Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Tenants search results',
      data: tenants,
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
//   ?q=          — text search across: location, furnishing
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

    const baseFilter = {};

    if (status)    baseFilter.propertyStatus = status;
    if (bhk)       baseFilter.bhk            = Number(bhk);
    if (furnishing) baseFilter.furnishing     = furnishing;
    if (maxRent)   baseFilter.rentAmount      = { $lte: Number(maxRent) };

    if (location && !q) {
      baseFilter.location = { $regex: location, $options: 'i' };
    }

    const filter = buildSearchFilter(q, SEARCH_FIELDS.rental, baseFilter);

    const skip  = (page - 1) * limit;
    const [total, rentals] = await Promise.all([
      RentalProperty.countDocuments(filter),
      RentalProperty.find(filter)
        .populate('propertyRef')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Rentals search results',
      data: rentals,
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
// Promise.all runs all 5 DB queries in parallel so total latency ≈ slowest
// single query (not the sum of all five).
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

    // Build one filter per collection — no structured filters for global search
    const propFilter    = buildSearchFilter(q, SEARCH_FIELDS.property, {});
    const sellerFilter  = buildSearchFilter(q, SEARCH_FIELDS.seller,   {});
    const buyerFilter   = buildSearchFilter(q, SEARCH_FIELDS.buyer,    {});
    const tenantFilter  = buildSearchFilter(q, SEARCH_FIELDS.tenant,   {});
    const rentalFilter  = buildSearchFilter(q, SEARCH_FIELDS.rental,   {});

    const sort = { createdAt: -1 };

    // All 5 collections queried in parallel — each gets count + docs together
    const [
      [propTotal,   properties],
      [sellerTotal, sellers],
      [buyerTotal,  buyers],
      [tenantTotal, tenants],
      [rentalTotal, rentals],
    ] = await Promise.all([
      Promise.all([
        Property.countDocuments(propFilter),
        Property.find(propFilter).sort(sort).limit(limit),
      ]),
      Promise.all([
        Seller.countDocuments(sellerFilter),
        Seller.find(sellerFilter).sort(sort).limit(limit),
      ]),
      Promise.all([
        Buyer.countDocuments(buyerFilter),
        Buyer.find(buyerFilter).sort(sort).limit(limit),
      ]),
      Promise.all([
        Tenant.countDocuments(tenantFilter),
        Tenant.find(tenantFilter).sort(sort).limit(limit),
      ]),
      Promise.all([
        RentalProperty.countDocuments(rentalFilter),
        RentalProperty.find(rentalFilter).populate('propertyRef').sort(sort).limit(limit),
      ]),
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
