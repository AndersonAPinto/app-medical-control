// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, bigint, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("MASTER"),
  planType: text("plan_type").notNull().default("FREE"),
  linkedMasterId: text("linked_master_id"),
  createdAt: timestamp("created_at").defaultNow()
});
var medications = pgTable("medications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  alertThreshold: integer("alert_threshold").notNull().default(5),
  intervalInHours: integer("interval_in_hours").notNull().default(8),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var doseSchedules = pgTable("dose_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  medId: text("med_id").notNull(),
  timeMillis: bigint("time_millis", { mode: "number" }).notNull(),
  status: text("status").notNull().default("PENDING"),
  confirmedAt: bigint("confirmed_at", { mode: "number" }),
  ownerId: text("owner_id").notNull()
});
var connections = pgTable("connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  masterId: text("master_id").notNull(),
  dependentId: text("dependent_id").notNull(),
  status: text("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow()
});
var notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  relatedId: text("related_id"),
  createdAt: timestamp("created_at").defaultNow()
});
var pushTokens = pgTable("push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  token: text("token").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
  role: true
});
var loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
var updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional()
});
var updateRoleSchema = z.object({
  role: z.enum(["MASTER", "DEPENDENT", "CONTROLLER"])
});
var insertMedicationSchema = createInsertSchema(medications).pick({
  name: true,
  dosage: true,
  currentStock: true,
  alertThreshold: true,
  intervalInHours: true
});
var updateMedicationSchema = z.object({
  name: z.string().min(1).optional(),
  dosage: z.string().min(1).optional(),
  currentStock: z.number().min(0).optional(),
  alertThreshold: z.number().min(0).optional(),
  intervalInHours: z.number().min(1).optional()
});
var insertConnectionSchema = z.object({
  targetId: z.string().min(1)
});

// server/storage.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, and, desc, sql as sql2 } from "drizzle-orm";
import ws from "ws";
import { Pool, neonConfig } from "@neondatabase/serverless";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool);
var DatabaseStorage = class {
  async createUser(user) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async getUserById(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async updateUser(id, data) {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }
  async getMedicationsByOwner(ownerId) {
    return db.select().from(medications).where(eq(medications.ownerId, ownerId));
  }
  async getMedicationById(id) {
    const [med] = await db.select().from(medications).where(eq(medications.id, id));
    return med;
  }
  async createMedication(med) {
    const [created] = await db.insert(medications).values(med).returning();
    return created;
  }
  async updateMedication(id, ownerId, data) {
    const [updated] = await db.update(medications).set(data).where(and(eq(medications.id, id), eq(medications.ownerId, ownerId))).returning();
    return updated;
  }
  async deleteMedication(id, ownerId) {
    await db.delete(medications).where(and(eq(medications.id, id), eq(medications.ownerId, ownerId)));
  }
  async updateMedicationStock(id, newStock) {
    await db.update(medications).set({ currentStock: newStock }).where(eq(medications.id, id));
  }
  async getSchedulesByOwner(ownerId) {
    return db.select().from(doseSchedules).where(eq(doseSchedules.ownerId, ownerId));
  }
  async getScheduleById(id) {
    const [schedule] = await db.select().from(doseSchedules).where(eq(doseSchedules.id, id));
    return schedule;
  }
  async getConfirmedSchedulesByOwner(ownerId) {
    return db.select().from(doseSchedules).where(and(eq(doseSchedules.ownerId, ownerId), eq(doseSchedules.status, "TAKEN"))).orderBy(desc(doseSchedules.confirmedAt));
  }
  async createSchedule(schedule) {
    const [created] = await db.insert(doseSchedules).values(schedule).returning();
    return created;
  }
  async updateScheduleStatus(id, status, confirmedAt) {
    await db.update(doseSchedules).set({ status, confirmedAt: confirmedAt ?? null }).where(eq(doseSchedules.id, id));
  }
  async createConnection(masterId, dependentId) {
    const [created] = await db.insert(connections).values({ masterId, dependentId }).returning();
    return created;
  }
  async getConnectionsByMaster(masterId) {
    return db.select().from(connections).where(eq(connections.masterId, masterId));
  }
  async getConnectionsByDependent(dependentId) {
    return db.select().from(connections).where(eq(connections.dependentId, dependentId));
  }
  async getConnectionCount(masterId) {
    const conns = await db.select().from(connections).where(eq(connections.masterId, masterId));
    return conns.length;
  }
  async acceptConnection(id) {
    await db.update(connections).set({ status: "ACCEPTED" }).where(eq(connections.id, id));
  }
  async deleteConnection(id) {
    await db.delete(connections).where(eq(connections.id, id));
  }
  async getSchedulesByOwnerWithStatus(ownerId, statuses) {
    const allSchedules = await db.select().from(doseSchedules).where(eq(doseSchedules.ownerId, ownerId)).orderBy(desc(doseSchedules.timeMillis));
    return allSchedules.filter((s) => statuses.includes(s.status));
  }
  async createNotification(data) {
    const [created] = await db.insert(notifications).values(data).returning();
    return created;
  }
  async getNotificationsByUser(userId) {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }
  async getUnreadCountByUser(userId) {
    const [result] = await db.select({ count: sql2`count(*)` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return Number(result.count);
  }
  async markNotificationRead(id) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }
  async markAllNotificationsRead(userId) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }
  async registerPushToken(userId, token) {
    const [existing] = await db.select().from(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
    if (existing) return existing;
    const [created] = await db.insert(pushTokens).values({ userId, token }).returning();
    return created;
  }
  async getPushTokensByUser(userId) {
    return db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
  }
  async getDependentsForMaster(masterId) {
    const conns = await this.getConnectionsByMaster(masterId);
    const acceptedConns = conns.filter((c) => c.status === "ACCEPTED");
    const dependents = [];
    for (const conn of acceptedConns) {
      try {
        const user = await this.getUserById(conn.dependentId);
        if (user) dependents.push(user);
      } catch (err) {
        console.error(`Failed to fetch dependent ${conn.dependentId}:`, err);
      }
    }
    return dependents;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}
async function registerRoutes(app2) {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production");
  }
  if (isProduction) {
    app2.set("trust proxy", 1);
  }
  const PgSession = connectPgSimple(session);
  app2.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true
      }),
      secret: process.env.SESSION_SECRET || "medcontrol-secret-key",
      name: "toma.sid",
      proxy: isProduction,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1e3,
        sameSite: isProduction ? "none" : "lax"
      }
    })
  );
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const existing = await storage.getUserByEmail(parsed.data.email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }
      const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
      const user = await storage.createUser({
        ...parsed.data,
        password: hashedPassword
      });
      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      const user = await storage.getUserByEmail(parsed.data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(parsed.data.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });
  app2.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data" });
      }
      if (parsed.data.email) {
        const existing = await storage.getUserByEmail(parsed.data.email);
        if (existing && existing.id !== req.session.userId) {
          return res.status(409).json({ message: "Email already in use" });
        }
      }
      const updated = await storage.updateUser(req.session.userId, parsed.data);
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.patch("/api/auth/role", requireAuth, async (req, res) => {
    try {
      const parsed = updateRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const updated = await storage.updateUser(req.session.userId, { role: parsed.data.role });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/auth/upgrade", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateUser(req.session.userId, { planType: "PREMIUM" });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Upgrade error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/auth/sync-plan", requireAuth, async (req, res) => {
    try {
      const { planType } = req.body;
      if (!planType || !["FREE", "PREMIUM"].includes(planType)) {
        return res.status(400).json({ message: "Invalid plan type" });
      }
      const updated = await storage.updateUser(req.session.userId, { planType });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Sync plan error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/users/search/:identifier", requireAuth, async (req, res) => {
    try {
      const { identifier } = req.params;
      let user = await storage.getUserById(identifier);
      if (!user) {
        user = await storage.getUserByEmail(identifier);
      }
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (error) {
      console.error("Search user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/medications", requireAuth, async (req, res) => {
    try {
      const meds = await storage.getMedicationsByOwner(req.session.userId);
      res.json(meds);
    } catch (error) {
      console.error("Get medications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/medications/:id", requireAuth, async (req, res) => {
    try {
      const med = await storage.getMedicationById(req.params.id);
      if (!med) {
        return res.status(404).json({ message: "Medication not found" });
      }
      res.json(med);
    } catch (error) {
      console.error("Get medication error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/medications", requireAuth, async (req, res) => {
    try {
      const parsed = insertMedicationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const user = await storage.getUserById(req.session.userId);
      if (user && user.planType === "FREE") {
        const existingMeds = await storage.getMedicationsByOwner(req.session.userId);
        if (existingMeds.length >= 10) {
          return res.status(403).json({
            message: "Limite de 10 medicamentos atingido no plano Free. Assine o Premium para adicionar medicamentos ilimitados.",
            requiresUpgrade: true
          });
        }
      }
      const med = await storage.createMedication({
        ...parsed.data,
        ownerId: req.session.userId
      });
      res.status(201).json(med);
    } catch (error) {
      console.error("Create medication error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.patch("/api/medications/:id", requireAuth, async (req, res) => {
    try {
      const parsed = updateMedicationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data" });
      }
      const updated = await storage.updateMedication(req.params.id, req.session.userId, parsed.data);
      if (!updated) {
        return res.status(404).json({ message: "Medication not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update medication error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.delete("/api/medications/:id", requireAuth, async (req, res) => {
    try {
      const med = await storage.getMedicationById(req.params.id);
      if (!med) {
        return res.status(404).json({ message: "Medication not found" });
      }
      if (med.ownerId !== req.session.userId) {
        return res.status(403).json({ message: "Not your medication" });
      }
      await storage.deleteMedication(req.params.id, req.session.userId);
      res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Delete medication error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.patch("/api/medications/:id/stock", requireAuth, async (req, res) => {
    try {
      const { currentStock } = req.body;
      if (typeof currentStock !== "number" || currentStock < 0) {
        return res.status(400).json({ message: "Invalid stock value" });
      }
      await storage.updateMedicationStock(req.params.id, currentStock);
      res.json({ message: "Stock updated" });
    } catch (error) {
      console.error("Update stock error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/schedules", requireAuth, async (req, res) => {
    try {
      const schedules = await storage.getSchedulesByOwner(req.session.userId);
      res.json(schedules);
    } catch (error) {
      console.error("Get schedules error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/schedules/history", requireAuth, async (req, res) => {
    try {
      const schedules = await storage.getConfirmedSchedulesByOwner(req.session.userId);
      const meds = await storage.getMedicationsByOwner(req.session.userId);
      const medMap = new Map(meds.map((m) => [m.id, m]));
      const enriched = schedules.map((s) => ({
        ...s,
        medicationName: medMap.get(s.medId)?.name || "Remedio removido",
        medicationDosage: medMap.get(s.medId)?.dosage || ""
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Get history error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/schedules", requireAuth, async (req, res) => {
    try {
      const { medId, timeMillis } = req.body;
      if (!medId || !timeMillis) {
        return res.status(400).json({ message: "medId and timeMillis required" });
      }
      const schedule = await storage.createSchedule({
        medId,
        timeMillis,
        status: "PENDING",
        confirmedAt: null,
        ownerId: req.session.userId
      });
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Create schedule error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.patch("/api/schedules/:id/confirm", requireAuth, async (req, res) => {
    try {
      const schedule = await storage.getScheduleById(req.params.id);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      if (schedule.ownerId !== req.session.userId) {
        return res.status(403).json({ message: "Not your schedule" });
      }
      await storage.updateScheduleStatus(req.params.id, "TAKEN", Date.now());
      res.json({ message: "Dose confirmed" });
    } catch (error) {
      console.error("Confirm dose error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/medications/:id/take-dose", requireAuth, async (req, res) => {
    try {
      const medId = req.params.id;
      const userId = req.session.userId;
      const now = Date.now();
      const med = await storage.getMedicationById(medId);
      if (!med) {
        return res.status(404).json({ message: "Medication not found" });
      }
      if (med.ownerId !== userId) {
        return res.status(403).json({ message: "Not your medication" });
      }
      const schedule = await storage.createSchedule({
        medId,
        timeMillis: now,
        status: "TAKEN",
        confirmedAt: now,
        ownerId: userId
      });
      if (med.currentStock > 0) {
        await storage.updateMedicationStock(medId, med.currentStock - 1);
      }
      const newStock = med.currentStock - 1;
      try {
        const conns = await storage.getConnectionsByDependent(userId);
        const acceptedConns = conns.filter((c) => c.status === "ACCEPTED");
        const dependent = await storage.getUserById(userId);
        if (newStock === 0) {
          await storage.createNotification({
            userId,
            type: "STOCK_EMPTY",
            title: "Estoque Zerado",
            message: `${med.name} est\xE1 sem estoque. Reponha o quanto antes.`,
            relatedId: medId
          });
          if (dependent && acceptedConns.length > 0) {
            for (const conn of acceptedConns) {
              await storage.createNotification({
                userId: conn.masterId,
                type: "STOCK_EMPTY",
                title: "Estoque Zerado",
                message: `${dependent.name}: ${med.name} sem estoque`,
                relatedId: medId
              });
            }
          }
        } else if (newStock > 0 && newStock <= med.alertThreshold) {
          await storage.createNotification({
            userId,
            type: "STOCK_LOW",
            title: "Estoque Baixo",
            message: `${med.name} com apenas ${newStock} unidades restantes`,
            relatedId: medId
          });
          if (dependent && acceptedConns.length > 0) {
            for (const conn of acceptedConns) {
              await storage.createNotification({
                userId: conn.masterId,
                type: "STOCK_LOW",
                title: "Estoque Baixo",
                message: `${dependent.name}: ${med.name} com apenas ${newStock} unidades restantes`,
                relatedId: medId
              });
            }
          }
        }
      } catch (notifError) {
        console.error("Notification error (take-dose):", notifError);
      }
      res.status(201).json({
        schedule,
        medName: med.name,
        patientId: userId,
        timestamp: now,
        status: "TAKEN"
      });
    } catch (error) {
      console.error("Take dose error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/connections", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role === "MASTER") {
        const conns = await storage.getConnectionsByMaster(req.session.userId);
        const enriched = [];
        for (const conn of conns) {
          const dep = await storage.getUserById(conn.dependentId);
          enriched.push({
            ...conn,
            linkedName: dep?.name || "Unknown",
            linkedEmail: dep?.email || "",
            linkedRole: dep?.role || ""
          });
        }
        res.json(enriched);
      } else {
        const conns = await storage.getConnectionsByDependent(req.session.userId);
        const enriched = [];
        for (const conn of conns) {
          const master = await storage.getUserById(conn.masterId);
          enriched.push({
            ...conn,
            linkedName: master?.name || "Unknown",
            linkedEmail: master?.email || "",
            linkedRole: master?.role || ""
          });
        }
        res.json(enriched);
      }
    } catch (error) {
      console.error("Get connections error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/connections", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== "MASTER") {
        return res.status(403).json({ message: "Only MASTER users can add connections" });
      }
      const parsed = insertConnectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data" });
      }
      let target = await storage.getUserById(parsed.data.targetId);
      if (!target) {
        target = await storage.getUserByEmail(parsed.data.targetId);
      }
      if (!target) {
        return res.status(404).json({ message: "User not found" });
      }
      if (target.id === req.session.userId) {
        return res.status(400).json({ message: "Cannot connect to yourself" });
      }
      if (user.planType === "FREE") {
        const count = await storage.getConnectionCount(req.session.userId);
        if (count >= 1) {
          return res.status(403).json({
            message: "Plano FREE limitado a 1 conexao. Faca upgrade para PREMIUM.",
            requiresUpgrade: true
          });
        }
      }
      const conn = await storage.createConnection(req.session.userId, target.id);
      try {
        await storage.createNotification({
          userId: target.id,
          type: "CONNECTION_REQUEST",
          title: "Solicita\xE7\xE3o de Conex\xE3o",
          message: `${user.name} quer se conectar com voc\xEA`,
          relatedId: conn.id
        });
      } catch (notifError) {
        console.error("Notification error (create-connection):", notifError);
      }
      res.status(201).json({
        ...conn,
        linkedName: target.name,
        linkedEmail: target.email,
        linkedRole: target.role
      });
    } catch (error) {
      console.error("Create connection error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.delete("/api/connections/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteConnection(req.params.id);
      res.json({ message: "Connection removed" });
    } catch (error) {
      console.error("Delete connection error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.patch("/api/connections/:id/accept", requireAuth, async (req, res) => {
    try {
      await storage.acceptConnection(req.params.id);
      try {
        const conns = await storage.getConnectionsByDependent(req.session.userId);
        const conn = conns.find((c) => c.id === req.params.id);
        if (conn) {
          const dependent = await storage.getUserById(conn.dependentId);
          if (dependent) {
            await storage.createNotification({
              userId: conn.masterId,
              type: "CONNECTION_ACCEPTED",
              title: "Conex\xE3o Aceita",
              message: `${dependent.name} aceitou sua conex\xE3o`,
              relatedId: conn.id
            });
          }
        }
      } catch (notifError) {
        console.error("Notification error (accept-connection):", notifError);
      }
      res.json({ message: "Connection accepted" });
    } catch (error) {
      console.error("Accept connection error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/dependents/:id/medications", requireAuth, async (req, res) => {
    try {
      const meds = await storage.getMedicationsByOwner(req.params.id);
      res.json(meds);
    } catch (error) {
      console.error("Get dependent medications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/dependents", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user || user.role !== "MASTER") {
        return res.status(403).json({ message: "Only MASTER users can view dependents" });
      }
      const dependents = await storage.getDependentsForMaster(req.session.userId);
      const enriched = [];
      for (const dep of dependents) {
        const schedules = await storage.getSchedulesByOwner(dep.id);
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.getTime();
        const todaySchedules = schedules.filter((s) => s.timeMillis >= todayStart);
        const takenToday = todaySchedules.filter((s) => s.status === "TAKEN").length;
        const missedToday = todaySchedules.filter((s) => s.status === "MISSED").length;
        const meds = await storage.getMedicationsByOwner(dep.id);
        enriched.push({
          id: dep.id,
          name: dep.name,
          email: dep.email,
          role: dep.role,
          takenToday,
          missedToday,
          totalMeds: meds.length
        });
      }
      res.json(enriched);
    } catch (error) {
      console.error("Get dependents error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/dependents/:id/history", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user || user.role !== "MASTER") {
        return res.status(403).json({ message: "Only MASTER users can view dependent history" });
      }
      const depId = req.params.id;
      const schedules = await storage.getSchedulesByOwnerWithStatus(depId, ["TAKEN", "MISSED"]);
      const meds = await storage.getMedicationsByOwner(depId);
      const medMap = new Map(meds.map((m) => [m.id, m]));
      const enriched = schedules.map((s) => ({
        ...s,
        medicationName: medMap.get(s.medId)?.name || "Remedio removido",
        medicationDosage: medMap.get(s.medId)?.dosage || ""
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Get dependent history error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifs = await storage.getNotificationsByUser(req.session.userId);
      res.json(notifs);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadCountByUser(req.session.userId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.session.userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/push-tokens", requireAuth, async (req, res) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Token is required" });
      }
      const pushToken = await storage.registerPushToken(req.session.userId, token);
      res.status(201).json(pushToken);
    } catch (error) {
      console.error("Register push token error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  const allowedOrigins = /* @__PURE__ */ new Set();
  const appAllowedOrigins = process.env.APP_ALLOWED_ORIGINS;
  if (appAllowedOrigins) {
    appAllowedOrigins.split(",").map((origin) => origin.trim()).filter(Boolean).forEach((origin) => allowedOrigins.add(origin));
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    allowedOrigins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (process.env.REPLIT_DOMAINS) {
    process.env.REPLIT_DOMAINS.split(",").forEach((domain) => {
      allowedOrigins.add(`https://${domain.trim()}`);
    });
  }
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && allowedOrigins.size === 0) {
    log(
      "APP_ALLOWED_ORIGINS is empty in production; web clients may be blocked by CORS."
    );
  }
  app2.use((req, res, next) => {
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    const originAllowed = origin && (allowedOrigins.has(origin) || !isProduction && Boolean(isLocalhost));
    if (originAllowed) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
