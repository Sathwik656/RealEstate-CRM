require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Property = require('../models/Property');
const Buyer = require('../models/Buyer');

const typeMapping = {
  'Land': { division: 'Residential', type: 'Residential Land / Plot' },
  'Shop': { division: 'Commercial', type: 'Shop' },
  'Independent House': { division: 'Residential', type: 'Independent House' },
  'Flat': { division: 'Residential', type: 'Flat / Apartment' },
  'Store': { division: 'Commercial', type: 'Shop' },
  'Garage': { division: 'Commercial', type: 'Commercial Building' }
};



async function migrate() {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoURI) throw new Error('MONGO_URI is missing');
    
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    let propertiesUpdated = 0;
    const properties = await Property.find({});
    
    for (const prop of properties) {
      let updated = false;
      
      // If missing division but has a legacy type or string type
      if (!prop.propertyDivision) {
        const mapped = typeMapping[prop.propertyType];
        if (mapped) {
          prop.propertyDivision = mapped.division;
          prop.propertyType = mapped.type;
        } else {
          // Fallback if not recognized but we need a division
          prop.propertyDivision = 'Residential';
          if (!prop.propertyType) prop.propertyType = 'Independent House';
        }
        updated = true;
      }

      
      if (updated) {
        await prop.save({ validateBeforeSave: false }); // Skip strict validation for older records
        propertiesUpdated++;
      }
    }
    
    console.log(`Migrated ${propertiesUpdated} properties.`);

    let buyersUpdated = 0;
    const buyers = await Buyer.find({});
    
    for (const buyer of buyers) {
      let updated = false;
      
      if (buyer.propertyTypeInterested && (!buyer.preferredPropertyDivisions || buyer.preferredPropertyDivisions.length === 0)) {
        const mapped = typeMapping[buyer.propertyTypeInterested];
        if (mapped) {
          buyer.preferredPropertyDivisions = [mapped.division];
          buyer.preferredPropertyTypes = [mapped.type];
          
          if (buyer.areaRequirement != null) {
            buyer.minArea = buyer.areaRequirement;
          }
        }
        updated = true;
      }
      
      if (updated) {
        await buyer.save({ validateBeforeSave: false });
        buyersUpdated++;
      }
    }
    
    console.log(`Migrated ${buyersUpdated} buyers.`);
    
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
