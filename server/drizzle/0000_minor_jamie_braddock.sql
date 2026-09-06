CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'AGENT');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('Land', 'Independent House', 'Apartment/Flat', 'Commercial Property', 'Agricultural Land', 'Industrial Property', 'Rental Property', 'Lease Property');--> statement-breakpoint
CREATE TYPE "public"."buyer_parking_type" AS ENUM('Open', 'Covered', 'Any');--> statement-breakpoint
CREATE TYPE "public"."buyer_status" AS ENUM('Active', 'Closed', 'Follow-up');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('Available', 'Sold', 'Rented', 'Leased');--> statement-breakpoint
CREATE TYPE "public"."property_purpose" AS ENUM('Sale', 'Rent', 'Lease');--> statement-breakpoint
CREATE TYPE "public"."parking_type" AS ENUM('Open', 'Covered', 'None');--> statement-breakpoint
CREATE TABLE "buyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" text NOT NULL,
	"buyer_name" text NOT NULL,
	"contact_number" text NOT NULL,
	"address" text,
	"preferred_location" text,
	"landmark_preference" text,
	"property_type_interested" "property_type",
	"budget_min" numeric(18, 2),
	"budget_max" numeric(18, 2),
	"area_requirement" numeric(18, 2),
	"bhk_requirement" integer,
	"parking_requirement" "buyer_parking_type" DEFAULT 'Any' NOT NULL,
	"follow_up_date" timestamp,
	"remarks" text,
	"note" text,
	"status" "buyer_status" DEFAULT 'Active' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"referred_by_agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyers_buyer_id_unique" UNIQUE("buyer_id")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" text NOT NULL,
	"seller_id" uuid NOT NULL,
	"referred_by_agent_id" uuid,
	"property_type" "property_type" NOT NULL,
	"property_title" text NOT NULL,
	"property_description" text,
	"property_status" "property_status" DEFAULT 'Available' NOT NULL,
	"purpose" "property_purpose" NOT NULL,
	"contact_number" text,
	"address" text,
	"location" text,
	"landmark" text,
	"parking_available" boolean DEFAULT false NOT NULL,
	"parking_type" "parking_type" DEFAULT 'None',
	"area" numeric(18, 2),
	"price" numeric(18, 2),
	"bhk" integer,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_property_id_unique" UNIQUE("property_id")
);
--> statement-breakpoint
CREATE TABLE "seller_properties" (
	"seller_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_properties_seller_id_property_id_pk" PRIMARY KEY("seller_id","property_id")
);
--> statement-breakpoint
CREATE TABLE "sellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" text NOT NULL,
	"seller_name" text NOT NULL,
	"contact_number" text NOT NULL,
	"address" text,
	"note" text,
	"created_by_user_id" uuid NOT NULL,
	"referred_by_agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sellers_seller_id_unique" UNIQUE("seller_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'ADMIN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_referred_by_agent_id_users_id_fk" FOREIGN KEY ("referred_by_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_referred_by_agent_id_users_id_fk" FOREIGN KEY ("referred_by_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_properties" ADD CONSTRAINT "seller_properties_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_properties" ADD CONSTRAINT "seller_properties_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_referred_by_agent_id_users_id_fk" FOREIGN KEY ("referred_by_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buyers_created_by_user_id_idx" ON "buyers" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "buyers_referred_by_agent_id_idx" ON "buyers" USING btree ("referred_by_agent_id");--> statement-breakpoint
CREATE INDEX "buyers_status_idx" ON "buyers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "buyers_follow_up_date_idx" ON "buyers" USING btree ("follow_up_date");--> statement-breakpoint
CREATE INDEX "buyers_created_at_idx" ON "buyers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "buyers_preferred_location_idx" ON "buyers" USING btree ("preferred_location");--> statement-breakpoint
CREATE INDEX "properties_created_by_user_id_idx" ON "properties" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "properties_referred_by_agent_id_idx" ON "properties" USING btree ("referred_by_agent_id");--> statement-breakpoint
CREATE INDEX "properties_property_type_idx" ON "properties" USING btree ("property_type");--> statement-breakpoint
CREATE INDEX "properties_property_status_idx" ON "properties" USING btree ("property_status");--> statement-breakpoint
CREATE INDEX "properties_purpose_idx" ON "properties" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "properties_location_idx" ON "properties" USING btree ("location");--> statement-breakpoint
CREATE INDEX "properties_price_idx" ON "properties" USING btree ("price");--> statement-breakpoint
CREATE INDEX "properties_bhk_idx" ON "properties" USING btree ("bhk");--> statement-breakpoint
CREATE INDEX "properties_created_at_idx" ON "properties" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "properties_location_status_idx" ON "properties" USING btree ("location","property_status");--> statement-breakpoint
CREATE INDEX "properties_type_purpose_idx" ON "properties" USING btree ("property_type","purpose");--> statement-breakpoint
CREATE INDEX "sellers_created_by_user_id_idx" ON "sellers" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "sellers_referred_by_agent_id_idx" ON "sellers" USING btree ("referred_by_agent_id");--> statement-breakpoint
CREATE INDEX "sellers_created_at_idx" ON "sellers" USING btree ("created_at");