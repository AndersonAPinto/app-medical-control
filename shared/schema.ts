import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, bigint, timestamp } from "drizzle-orm/pg-core";
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
