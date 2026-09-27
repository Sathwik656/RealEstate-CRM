'use strict';
require('dotenv').config();
const mongoose = require('mongoose');

const Property = require('../models/Property');
const Buyer = require('../models/Buyer');
const Seller = require('../models/Seller');
const User = require('../models/User');
const Deal = require('../models/Deal');
const LocationCode = require('../models/LocationCode');
const { generateEntityCode, generateDealCode } = require('../utils/generateCode');

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Drop the counters collection completely
    try {
      await mongoose.connection.collection('counters').drop();
      console.log('Dropped counters collection');
    } catch (e) {
      if (e.code === 26) {
        console.log('Counters collection does not exist');
      } else {
        console.error('Error dropping counters:', e);
      }
    }

    // 1. Migrate Buyers
    console.log('Migrating Buyers...');
    const buyers = await Buyer.find();
    for (const b of buyers) {
      const code = await generateEntityCode('Buyer');
      b.code = code;
      // We're removing seqNumber from the schema, so we should also remove it from documents
      b.set('seqNumber', undefined, { strict: false });
      await b.save({ validateBeforeSave: false });
    }
    await Buyer.updateMany({}, { $unset: { seqNumber: "" } });

    // 2. Migrate Sellers
    console.log('Migrating Sellers...');
    const sellers = await Seller.find();
    for (const s of sellers) {
      const code = await generateEntityCode('Seller');
      s.code = code;
      s.set('seqNumber', undefined, { strict: false });
      await s.save({ validateBeforeSave: false });
    }
    await Seller.updateMany({}, { $unset: { seqNumber: "" } });

    // 3. Migrate Agents
    console.log('Migrating Agents...');
    const agents = await User.find({ role: 'agent' });
    for (const a of agents) {
      const code = await generateEntityCode('Agent');
      a.code = code;
      a.set('seqNumber', undefined, { strict: false });
      await a.save({ validateBeforeSave: false });
    }
    await User.updateMany({}, { $unset: { seqNumber: "" } });

    // 4. Migrate Properties
    console.log('Migrating Properties...');
    const properties = await Property.find().populate('location');
    for (const p of properties) {
      let locStr = 'UNK';
      if (p.location && p.location.code) locStr = p.location.code;

      const code = await generateEntityCode('Property', locStr);
      p.code = code;
      p.set('seqNumber', undefined, { strict: false });
      await p.save({ validateBeforeSave: false });
    }
    await Property.updateMany({}, { $unset: { seqNumber: "" } });

    // 5. Migrate Deals
    console.log('Migrating Deals...');
    const deals = await Deal.find();
    for (const d of deals) {
      const code = await generateDealCode();
      d.dealId = code;
      await d.save({ validateBeforeSave: false });
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
