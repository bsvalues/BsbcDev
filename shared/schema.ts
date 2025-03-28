import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  isDevUser: boolean("is_dev_user").default(false),
  tenantId: integer("tenant_id"),
});

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  plan: text("plan").notNull().default("free_trial"),
  status: text("status").notNull().default("active"),
  adminEmail: text("admin_email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  settings: jsonb("settings"),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  planId: integer("plan_id").notNull(),
  status: text("status").notNull().default("active"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
});

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  features: text("features").array(),
  isActive: boolean("is_active").default(true),
});

// Property Tax Valuation System Tables
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  parcelId: text("parcel_id").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  propertyType: text("property_type").notNull(), // residential, commercial, industrial, etc.
  zoneCode: text("zone_code").notNull(),
  landArea: doublePrecision("land_area").notNull(), // in sq. feet
  buildingArea: doublePrecision("building_area"), // in sq. feet
  yearBuilt: integer("year_built"),
  bedrooms: integer("bedrooms"),
  bathrooms: doublePrecision("bathrooms"),
  features: text("features").array(),
  lastAssessedValue: integer("last_assessed_value"),
  lastAssessedDate: timestamp("last_assessed_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
  updatedBy: integer("updated_by"),
  status: text("status").notNull().default("active"),
  propertyDetails: jsonb("property_details"),
});

export const propertyValuations = pgTable("property_valuations", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  assessedValue: integer("assessed_value").notNull(),
  marketValue: integer("market_value").notNull(),
  taxableValue: integer("taxable_value").notNull(),
  assessmentDate: timestamp("assessment_date").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  valuationMethod: text("valuation_method").notNull(),
  assessorId: integer("assessor_id").notNull(),
  status: text("status").notNull().default("draft"), // draft, published, appealed, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  valuationFactors: jsonb("valuation_factors"),
});

export const propertyAppeals = pgTable("property_appeals", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  valuationId: integer("valuation_id").notNull(),
  submittedBy: integer("submitted_by").notNull(),
  reviewedBy: integer("reviewed_by"),
  reason: text("reason").notNull(),
  requestedValue: integer("requested_value").notNull(),
  evidenceUrls: text("evidence_urls").array(),
  status: text("status").notNull().default("pending"), // pending, under_review, approved, rejected
  submittedAt: timestamp("submitted_at").notNull(),
  reviewedAt: timestamp("reviewed_at"),
  decision: text("decision"),
  decisionReason: text("decision_reason"),
  adjustedValue: integer("adjusted_value"),
});

export const taxRates = pgTable("tax_rates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  zoneCode: text("zone_code").notNull(),
  propertyType: text("property_type").notNull(),
  taxYear: integer("tax_year").notNull(),
  millageRate: doublePrecision("millage_rate").notNull(), // tax per $1000 of assessed value
  exemptionAmount: integer("exemption_amount").default(0),
  specialAssessments: jsonb("special_assessments"),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  createdBy: integer("created_by").notNull(),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  status: text("status").notNull().default("active"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true });
export const insertPlanSchema = createInsertSchema(plans).omit({ id: true });

export const insertPropertySchema = createInsertSchema(properties).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  updatedBy: true
});
export const insertPropertyValuationSchema = createInsertSchema(propertyValuations).omit({ 
  id: true, 
  createdAt: true 
});
export const insertPropertyAppealSchema = createInsertSchema(propertyAppeals).omit({ 
  id: true, 
  reviewedAt: true,
  reviewedBy: true,
  decision: true,
  decisionReason: true,
  adjustedValue: true
});
export const insertTaxRateSchema = createInsertSchema(taxRates).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  updatedBy: true
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export type InsertPropertyValuation = z.infer<typeof insertPropertyValuationSchema>;
export type PropertyValuation = typeof propertyValuations.$inferSelect;

export type InsertPropertyAppeal = z.infer<typeof insertPropertyAppealSchema>;
export type PropertyAppeal = typeof propertyAppeals.$inferSelect;

export type InsertTaxRate = z.infer<typeof insertTaxRateSchema>;
export type TaxRate = typeof taxRates.$inferSelect;
