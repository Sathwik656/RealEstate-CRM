'use strict';
const { pgTable, text, uuid, timestamp, integer, numeric, boolean, index } = require('drizzle-orm/pg-core');
const { users } = require('./users');
const { sellers } = require('./sellers');
const { propertyType, propertyStatus, propertyPurpose, parkingType } = require('./enums');

const properties = pgTable(
  'properties',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    propertyId: text('property_id').notNull().unique(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    referredByAgentId: uuid('referred_by_agent_id').references(() => users.id),
    propertyType: propertyType('property_type').notNull(),
    propertyTitle: text('property_title').notNull(),
    propertyDescription: text('property_description'),
    propertyStatus: propertyStatus('property_status').notNull().default('Available'),
    purpose: propertyPurpose('purpose').notNull(),
    contactNumber: text('contact_number'),
    address: text('address'),
    location: text('location'),
    landmark: text('landmark'),
    parkingAvailable: boolean('parking_available').notNull().default(false),
    parkingType: parkingType('parking_type').default('None'),
    area: numeric('area', { precision: 18, scale: 2 }),
    price: numeric('price', { precision: 18, scale: 2 }),
    bhk: integer('bhk'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('properties_created_by_user_id_idx').on(table.createdByUserId),
    index('properties_referred_by_agent_id_idx').on(table.referredByAgentId),
    index('properties_property_type_idx').on(table.propertyType),
    index('properties_property_status_idx').on(table.propertyStatus),
    index('properties_purpose_idx').on(table.purpose),
    index('properties_location_idx').on(table.location),
    index('properties_price_idx').on(table.price),
    index('properties_bhk_idx').on(table.bhk),
    index('properties_created_at_idx').on(table.createdAt),
    index('properties_location_status_idx').on(table.location, table.propertyStatus),
    index('properties_type_purpose_idx').on(table.propertyType, table.purpose),
  ]
);

module.exports = { properties };