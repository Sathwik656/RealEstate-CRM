'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');

const fix = async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    await db.collection('properties').updateMany(
      { location: { $type: "string", $in: ["", null] } },
      { $unset: { location: 1 } }
    );
    console.log("Fixed empty locations");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
};
fix();
