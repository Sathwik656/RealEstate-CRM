'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const Property = require('../models/Property');
const LocationCode = require('../models/LocationCode');
const connectDB = require('../config/db');

/**
 * Migration script to convert string `location` values to LocationCode ObjectIds.
 */
const migratePropertyLocations = async () => {
  try {
    await connectDB();
    console.log('🔄 Starting Property Location Migration...');

    // Find properties where location is still a string
    const properties = await Property.find({ location: { $type: 'string' } });
    console.log(`Found ${properties.length} properties needing migration.`);

    let successCount = 0;
    let failCount = 0;

    for (const property of properties) {
      if (!property.location) continue;
      
      const locName = property.location.trim();
      
      // Find the corresponding location code
      const locCode = await LocationCode.findOne({
        location: { $regex: new RegExp(`^${locName}$`, 'i') }
      });

      if (locCode) {
        // Update property location to use ObjectId
        property.location = locCode._id;
        await property.save({ validateBeforeSave: false }); // Bypass validation for old records if any
        successCount++;
        console.log(`✅ Migrated property ${property.propertyId}: "${locName}" -> ${locCode._id}`);
      } else {
        console.warn(`⚠️ Could not find LocationCode for "${locName}" on property ${property.propertyId}`);
        failCount++;
      }
    }

    console.log(`\n🎉 Migration Complete!`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed to migrate: ${failCount}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migratePropertyLocations();
