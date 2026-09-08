'use strict';
const mongoose = require('mongoose');

const locationCodeSchema = new mongoose.Schema(
  {
    location: {
      type: String,
      required: [true, 'Location name is required'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Location code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [10, 'Code cannot be more than 10 characters'],
    },
  },
  {
    timestamps: true,
  }
);

locationCodeSchema.index({ location: 'text' });
locationCodeSchema.index({ code: 1 });

module.exports = mongoose.model('LocationCode', locationCodeSchema);
