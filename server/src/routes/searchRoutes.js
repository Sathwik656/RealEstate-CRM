'use strict';
const express = require('express');
const router  = express.Router();
const {
  searchProperties,
  searchSellers,
  searchBuyers,
  searchGlobal,
} = require('../controllers/searchController');
const { auth, authorizeRoles } = require('../middleware/auth');

// All search routes require auth
router.use(auth);

// Property search can be used by Agents and Admins
router.get('/properties', searchProperties); // GET /api/search/properties?q=sem&status=Available

// These routes are accessible by agents (with results filtered) and admins
// ─── Collection-level search ──────────────────────────────────────────────────
// All accept optional ?q=<term> for multi-field text search
// plus their individual structured filter params.

router.get('/sellers',    searchSellers);    // GET /api/search/sellers?q=raj
router.get('/buyers',     searchBuyers);     // GET /api/search/buyers?q=rose&status=Active

// ─── Global cross-collection search ──────────────────────────────────────────
// Searches all 5 collections in parallel using Promise.all.
// Required: ?q=<term>
// Optional: ?limit=<n>  (per-collection result cap, default 5)
// Returns:  { properties:[], sellers:[], buyers:[] }

router.get('/global', searchGlobal);         // GET /api/search/global?q=sem

module.exports = router;
