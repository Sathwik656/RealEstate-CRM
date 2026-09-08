'use strict';
/**
 * Seed script for location codes.
 * Uses bulkWrite with upsert so it is safe to re-run — no duplicate records.
 * Source of truth: mangaloreLocations.js (used ONLY for initial seed).
 * After seeding, the database is the authoritative source.
 */
const LocationCode = require('../models/LocationCode');
// The seed data file — used ONLY for initial migration. After seeding, DB is the source of truth.
const MANGALORE_LOCATIONS = require('../data/mangaloreLocations');

const seedLocations = async () => {
  try {
    const entries = Object.entries(MANGALORE_LOCATIONS);

    const ops = entries.map(([location, code]) => ({
      updateOne: {
        filter: { location },
        update: { $setOnInsert: { location, code: code.toUpperCase() } },
        upsert: true,
      },
    }));

    const result = await LocationCode.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount;

    if (inserted > 0) {
      console.log(`📍 Seeded ${inserted} new location codes into the database.`);
    } else {
      console.log('📍 Location codes already seeded — no new records inserted.');
    }
  } catch (err) {
    console.error('❌ Location code seeding failed:', err.message);
  }
};

module.exports = seedLocations;
