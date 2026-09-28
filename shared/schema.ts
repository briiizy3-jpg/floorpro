import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import type * as z from "zod/mini";

// ─── Users (simple auth) ───
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  plan: text("plan").notNull().default("free"), // free | pro | enterprise
  subscriptionStatus: text("subscription_status").notNull().default("inactive"), // inactive | active | trial | canceled
  trialEndsAt: text("trial_ends_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Projects ───
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  clientName: text("client_name"),
  clientAddress: text("client_address"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// ─── Rooms (within a project) ───
export const rooms = sqliteTable("rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  width: real("width").notNull(), // feet
  length: real("length").notNull(), // feet
  shape: text("shape").notNull().default("rectangular"), // rectangular | l-shaped | custom
  materialType: text("material_type").notNull().default("plank"), // plank | tile | carpet | sheet
  materialWidth: real("material_width"), // inches — plank/tile width
  materialLength: real("material_length"), // inches — plank/tile length
  pattern: text("pattern").notNull().default("straight"), // straight | diagonal | herringbone | chevron | brick
  wasteFactor: real("waste_factor").notNull().default(10), // percentage
  pricePerUnit: real("price_per_unit"), // $ per sqft
  laborPerSqft: real("labor_per_sqft"), // $ per sqft labor
  layoutData: text("layout_data"), // JSON: additional room geometry / obstacles
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
});

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

// ─── Subscriptions (payment records) ───
export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  plan: text("plan").notNull(), // pro | enterprise
  amount: real("amount").notNull(),
  status: text("status").notNull().default("active"), // active | cancelled | expired
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  startDate: text("start_date").notNull().default(new Date().toISOString()),
  endDate: text("end_date"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
