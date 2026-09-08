require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const User = require('./src/models/User');
const Buyer = require('./src/models/Buyer');
const Seller = require('./src/models/Seller');
const Property = require('./src/models/Property');
const SellerProperty = require('./src/models/SellerProperty');

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Update Users: convert 'manager' to 'agent'
    console.log('Migrating Users...');
    const userResult = await User.collection.updateMany(
      { role: 'manager' },
      { $set: { role: 'agent' } }
    );
    console.log(`Updated ${userResult.modifiedCount} users from 'manager' to 'agent'.`);

    // 2. Migrate Seller -> propertiesLinked to SellerProperty junction & Property.sellerId
    console.log('Migrating Sellers & SellerProperty relations...');
    const sellers = await Seller.collection.find({ propertiesLinked: { $exists: true } }).toArray();
    let junctionCount = 0;
    let propertySellerIdCount = 0;

    for (const seller of sellers) {
      if (seller.propertiesLinked && Array.isArray(seller.propertiesLinked)) {
        for (const propertyId of seller.propertiesLinked) {
          // Check if junction already exists
          const existingJunction = await SellerProperty.collection.findOne({
            sellerId: seller._id,
            propertyId: propertyId
          });
          
          if (!existingJunction) {
            await SellerProperty.collection.insertOne({
              sellerId: seller._id,
              propertyId: propertyId,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            junctionCount++;
          }

          // Update Property to have sellerId (based on junction, if not already set)
          const propUpdate = await Property.collection.updateOne(
            { _id: propertyId, sellerId: { $exists: false } },
            { $set: { sellerId: seller._id } }
          );
          if (propUpdate.modifiedCount > 0) propertySellerIdCount++;
        }
      }
    }
    console.log(`Created ${junctionCount} SellerProperty junction records.`);
    console.log(`Set sellerId on ${propertySellerIdCount} Property records.`);

    // 3. Rename fields and unset deprecated fields across collections
    console.log('Renaming createdBy -> createdByUserId and unsetting old fields...');

    // Sellers
    const sellerUpdate = await Seller.collection.updateMany(
      {},
      { 
        $rename: { createdBy: 'createdByUserId' },
        $unset: { propertiesLinked: 1 }
      }
    );
    console.log(`Updated Sellers: ${sellerUpdate.modifiedCount}`);

    // Buyers
    const buyerUpdate = await Buyer.collection.updateMany(
      {},
      { 
        $rename: { createdBy: 'createdByUserId' },
        $unset: { followUpDate: 1, landmarkPreference: 1 }
      }
    );
    console.log(`Updated Buyers: ${buyerUpdate.modifiedCount}`);

    // Properties
    const propertyUpdate = await Property.collection.updateMany(
      {},
      { 
        $rename: { createdBy: 'createdByUserId' },
        $unset: { ownerName: 1, images: 1 }
      }
    );
    console.log(`Updated Properties: ${propertyUpdate.modifiedCount}`);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

migrate();
