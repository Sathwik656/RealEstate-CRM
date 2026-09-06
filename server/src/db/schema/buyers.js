'use strict';
const { pgTable, text, uuid, timestamp, integer, numeric, index } = require('drizzle-orm/pg-core');
const { users } = require('./users');
const { propertyType, buyerParkingType, buyerStatus } = require('./enums');

const buyers = pgTable(
  'buyers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    buyerId: text('buyer_id').notNull().unique(),
    buyerName: text('buyer_name').notNull(),
    contactNumber: text('contact_number').notNull(),
    address: text('address'),
    preferredLocation: text('preferred_location'),
    landmarkPreference: text('landmark_preference'),
    propertyTypeInterested: propertyType('property_type_interested'),
    budgetMin: numeric('budget_min', { precision: 18, scale: 2 }),
    budgetMax: numeric('budget_max', { precision: 18, scale: 2 }),
    areaRequirement: numeric('area_requirement', { precision: 18, scale: 2 }),
    bhkRequirement: integer('bhk_requirement'),
    parkingRequirement: buyerParkingType('parking_requirement').notNull().default('Any'),
    followUpDate: timestamp('follow_up_date'),
    remarks: text('remarks'),
    note: text('note'),
    status: buyerStatus('status').notNull().default('Active'),
    createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
    referredByAgentId: uuid('referred_by_agent_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('buyers_created_by_user_id_idx').on(table.createdByUserId),
    index('buyers_referred_by_agent_id_idx').on(table.referredByAgentId),
    index('buyers_status_idx').on(table.status),
    index('buyers_follow_up_date_idx').on(table.followUpDate),
    index('buyers_created_at_idx').on(table.createdAt),
    index('buyers_preferred_location_idx').on(table.preferredLocation),
  ]
);

module.exports = { buyers };