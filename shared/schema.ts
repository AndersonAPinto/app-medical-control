import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, bigint, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("MASTER"),
  planType: text("plan_type").notNull().default("FREE"),
  subscriptionStatus: text("subscription_status").notNull().default("INACTIVE"),
  subscriptionInterval: text("subscription_interval"),
  subscriptionProductId: text("subscription_product_id"),
  subscriptionEntitlementId: text("subscription_entitlement_id"),
  revenueCatCustomerId: text("revenuecat_customer_id"),
  subscriptionStore: text("subscription_store"),
  subscriptionWillRenew: boolean("subscription_will_renew").notNull().default(false),
  subscriptionStartedAt: timestamp("subscription_started_at"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  subscriptionCanceledAt: timestamp("subscription_canceled_at"),
  subscriptionLastEventAt: timestamp("subscription_last_event_at"),
  linkedMasterId: text("linked_master_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medications = pgTable("medications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  alertThreshold: integer("alert_threshold").notNull().default(5),
  intervalInHours: integer("interval_in_hours").notNull().default(8),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const doseSchedules = pgTable("dose_schedules", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  medId: text("med_id").notNull(),
  timeMillis: bigint("time_millis", { mode: "number" }).notNull(),
  status: text("status").notNull().default("PENDING"),
  confirmedAt: bigint("confirmed_at", { mode: "number" }),
  ownerId: text("owner_id").notNull(),
});

export const connections = pgTable("connections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  masterId: text("master_id").notNull(),
  dependentId: text("dependent_id").notNull(),
  status: text("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  relatedId: text("related_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pushTokens = pgTable("push_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  token: text("token").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
  role: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(["MASTER", "DEPENDENT", "CONTROLLER"]),
});

export const insertMedicationSchema = createInsertSchema(medications).pick({
  name: true,
  dosage: true,
  currentStock: true,
  alertThreshold: true,
  intervalInHours: true,
});

export const updateMedicationSchema = z.object({
  name: z.string().min(1).optional(),
  dosage: z.string().min(1).optional(),
  currentStock: z.number().min(0).optional(),
  alertThreshold: z.number().min(0).optional(),
  intervalInHours: z.number().min(1).optional(),
});

export const insertConnectionSchema = z.object({
  targetId: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type DoseSchedule = typeof doseSchedules.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type PushToken = typeof pushTokens.$inferSelect;
