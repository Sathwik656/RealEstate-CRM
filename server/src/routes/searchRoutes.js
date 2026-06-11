'use strict';
const express = require('express');
const router  = express.Router();
const {
  searchProperties,
  searchSellers,
  searchBuyers,
  searchTenants,
  searchRentals,
  searchGlobal,
} = require('../controllers/searchController');
const auth = require('../middleware/auth');

// All search routes are protected by JWT auth
router.use(auth);

// ─── Collection-level search ──────────────────────────────────────────────────
// All accept optional ?q=<term> for multi-field text search
// plus their individual structured filter params.

router.get('/properties', searchProperties); // GET /api/search/properties?q=sem&status=Available
router.get('/sellers',    searchSellers);    // GET /api/search/sellers?q=raj
router.get('/buyers',     searchBuyers);     // GET /api/search/buyers?q=rose&status=Active
router.get('/tenants',    searchTenants);    // GET /api/search/tenants?q=kumar&bhk=2
router.get('/rentals',    searchRentals);    // GET /api/search/rentals?q=semi&maxRent=20000

// ─── Global cross-collection search ──────────────────────────────────────────
// Searches all 5 collections in parallel using Promise.all.
// Required: ?q=<term>
// Optional: ?limit=<n>  (per-collection result cap, default 5)
// Returns:  { properties:[], sellers:[], buyers:[], tenants:[], rentals:[] }

router.get('/global', searchGlobal);         // GET /api/search/global?q=sem

module.exports = router;
