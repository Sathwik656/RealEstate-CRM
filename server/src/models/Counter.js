const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. 'Property', 'Buyer', 'Seller', 'Agent'
  seq: { type: Number, default: 0 }
});

module.exports = mongoose.model('Counter', counterSchema);
