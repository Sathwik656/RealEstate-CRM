'use strict';
const express = require('express');
const router = express.Router();
const {
  searchProperties, searchBuyers, searchTenants, searchRentals, searchSellers,
} = require('../controllers/searchController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/properties', searchProperties);
router.get('/buyers', searchBuyers);
router.get('/tenants', searchTenants);
router.get('/rentals', searchRentals);
router.get('/sellers', searchSellers);

module.exports = router;
