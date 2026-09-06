'use strict';
const { pgEnum } = require('drizzle-orm/pg-core');

const userRole = pgEnum('user_role', ['ADMIN', 'AGENT']);

const propertyType = pgEnum('property_type', [
  'Land',
  'Independent House',
  'Apartment/Flat',
  'Commercial Property',
  'Agricultural Land',
  'Industrial Property',
  'Rental Property',
  'Lease Property',
]);

const buyerParkingType = pgEnum('buyer_parking_type', ['Open', 'Covered', 'Any']);
const buyerStatus = pgEnum('buyer_status', ['Active', 'Closed', 'Follow-up']);
const propertyStatus = pgEnum('property_status', ['Available', 'Sold', 'Rented', 'Leased']);
const propertyPurpose = pgEnum('property_purpose', ['Sale', 'Rent', 'Lease']);
const parkingType = pgEnum('parking_type', ['Open', 'Covered', 'None']);

module.exports = {
  userRole,
  propertyType,
  buyerParkingType,
  buyerStatus,
  propertyStatus,
  propertyPurpose,
  parkingType,
};