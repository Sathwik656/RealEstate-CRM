const mongoose = require('mongoose');
const Property = require('./src/models/Property');
const PropertyInterest = require('./src/models/PropertyInterest');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://sathwikpsy:Veenu123@cluster0.p7ahe.mongodb.net/crm?retryWrites=true&w=majority')
  .then(async () => {
    const properties = await Property.find({ propertyStatus: 'In Allotment' });
    for (let p of properties) {
      const count = await PropertyInterest.countDocuments({ propertyId: p._id, status: { $in: ['interested'] } });
      console.log('Property', p.propertyTitle, 'has', count, 'active interests');
      if (count === 0) {
        p.propertyStatus = 'Available';
        await p.save();
        console.log('Updated to Available');
      }
    }
    process.exit(0);
  });
