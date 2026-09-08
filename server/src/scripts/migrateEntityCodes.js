'use strict';
require('dotenv').config();
const mongoose = require('mongoose');

const Property = require('../models/Property');
const Buyer = require('../models/Buyer');
const Seller = require('../models/Seller');
const User = require('../models/User');
const LocationCode = require('../models/LocationCode');
const Counter = require('../models/Counter');
const { generateEntityCode } = require('../utils/generateCode');

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Reset counters
    await Counter.deleteMany({});
    console.log('Reset counters');

    const year = String(new Date().getFullYear()).slice(-2);

    // 2. Migrate Buyers
    console.log('Migrating Buyers...');
    const buyers = await Buyer.find().sort({ createdAt: 1 });
    let bSeq = 1;
    for (const b of buyers) {
      b.seqNumber = bSeq;
      b.code = `TVMB-${year}-${String(bSeq).padStart(4, '0')}`;
      await b.save({ validateBeforeSave: false });
      bSeq++;
    }
    if (bSeq > 1) await Counter.create({ _id: 'Buyer', seq: bSeq - 1 });

    // 3. Migrate Sellers
    console.log('Migrating Sellers...');
    const sellers = await Seller.find().sort({ createdAt: 1 });
    let sSeq = 1;
    for (const s of sellers) {
      s.seqNumber = sSeq;
      s.code = `TVMS-${year}-${String(sSeq).padStart(4, '0')}`;
      await s.save({ validateBeforeSave: false });
      sSeq++;
    }
    if (sSeq > 1) await Counter.create({ _id: 'Seller', seq: sSeq - 1 });

    // 4. Migrate Agents
    console.log('Migrating Agents...');
    const agents = await User.find({ role: 'agent' }).sort({ createdAt: 1 });
    let aSeq = 1;
    for (const a of agents) {
      a.seqNumber = aSeq;
      a.code = `TVMA-${year}-${String(aSeq).padStart(4, '0')}`;
      await a.save({ validateBeforeSave: false });
      aSeq++;
    }
    if (aSeq > 1) await Counter.create({ _id: 'Agent', seq: aSeq - 1 });

    // 5. Migrate Properties
    console.log('Migrating Properties...');
    const properties = await Property.find().sort({ createdAt: 1 }).populate('location');
    let pSeq = 1;
    for (const p of properties) {
      p.seqNumber = pSeq;
      // Handle fallback if location is somehow missing or old text
      let locStr = 'UNK';
      if (p.location && p.location.code) locStr = p.location.code;

      p.code = `TVMP-${year}-${locStr}-${String(pSeq).padStart(4, '0')}`;
      await p.save({ validateBeforeSave: false });
      pSeq++;
    }
    if (pSeq > 1) await Counter.create({ _id: 'Property', seq: pSeq - 1 });

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
