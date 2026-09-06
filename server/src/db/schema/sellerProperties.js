'use strict';
const { pgTable, uuid, timestamp, primaryKey } = require('drizzle-orm/pg-core');
const { sellers } = require('./sellers');
const { properties } = require('./properties');

const sellerProperties = pgTable(
  'seller_properties',
  {
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id, { onDelete: 'cascade' }),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sellerId, table.propertyId] }),
  ]
);

module.exports = { sellerProperties };