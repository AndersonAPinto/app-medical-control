import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import {
  insertUserSchema,
  loginSchema,
  updateProfileSchema,
  updateRoleSchema,
  insertMedicationSchema,
  updateMedicationSchema,
  insertConnectionSchema,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production");
  }

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "medcontrol-secret-key",
      name: "toma.sid",
      proxy: isProduction,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: isProduction ? "none" : "lax",
      },
    })
  );

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }

      const existing = await storage.getUserByEmail(parsed.data.email!);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
      const user = await storage.createUser({
        ...parsed.data,
        password: hashedPassword,
      });

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
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

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
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

  app.patch("/api/auth/profile", requireAuth, async (req: Request, res: Response) => {
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

      const updated = await storage.updateUser(req.session.userId!, parsed.data);
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/auth/role", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = updateRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updated = await storage.updateUser(req.session.userId!, { role: parsed.data.role });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/upgrade", requireAuth, async (req: Request, res: Response) => {
    try {
      const updated = await storage.updateUser(req.session.userId!, { planType: "PREMIUM" });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Upgrade error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/sync-plan", requireAuth, async (req: Request, res: Response) => {
    try {
      const { planType } = req.body;
      if (!planType || !["FREE", "PREMIUM"].includes(planType)) {
        return res.status(400).json({ message: "Invalid plan type" });
      }
      const updated = await storage.updateUser(req.session.userId!, { planType });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Sync plan error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/users/search/:identifier", requireAuth, async (req: Request, res: Response) => {
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

  app.get("/api/medications", requireAuth, async (req: Request, res: Response) => {
    try {
      const meds = await storage.getMedicationsByOwner(req.session.userId!);
      res.json(meds);
    } catch (error) {
      console.error("Get medications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/medications/:id", requireAuth, async (req: Request, res: Response) => {
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

  app.post("/api/medications", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = insertMedicationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (user && user.planType === "FREE") {
        const existingMeds = await storage.getMedicationsByOwner(req.session.userId!);
        if (existingMeds.length >= 10) {
          return res.status(403).json({
            message: "Limite de 10 medicamentos atingido no plano Free. Assine o Premium para adicionar medicamentos ilimitados.",
            requiresUpgrade: true,
          });
        }
      }

      const med = await storage.createMedication({
        ...parsed.data,
        ownerId: req.session.userId!,
      });
      res.status(201).json(med);
    } catch (error) {
      console.error("Create medication error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/medications/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = updateMedicationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data" });
      }

      const updated = await storage.updateMedication(req.params.id, req.session.userId!, parsed.data);
      if (!updated) {
        return res.status(404).json({ message: "Medication not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update medication error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/medications/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const med = await storage.getMedicationById(req.params.id);
      if (!med) {
        return res.status(404).json({ message: "Medication not found" });
      }
      if (med.ownerId !== req.session.userId) {
        return res.status(403).json({ message: "Not your medication" });
      }
      await storage.deleteMedication(req.params.id, req.session.userId!);
      res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Delete medication error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/medications/:id/stock", requireAuth, async (req: Request, res: Response) => {
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

  app.get("/api/schedules", requireAuth, async (req: Request, res: Response) => {
    try {
      const schedules = await storage.getSchedulesByOwner(req.session.userId!);
      res.json(schedules);
    } catch (error) {
      console.error("Get schedules error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/schedules/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const schedules = await storage.getConfirmedSchedulesByOwner(req.session.userId!);
      const meds = await storage.getMedicationsByOwner(req.session.userId!);
      const medMap = new Map(meds.map(m => [m.id, m]));

      const enriched = schedules.map(s => ({
        ...s,
        medicationName: medMap.get(s.medId)?.name || "Remedio removido",
        medicationDosage: medMap.get(s.medId)?.dosage || "",
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Get history error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/schedules", requireAuth, async (req: Request, res: Response) => {
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
        ownerId: req.session.userId!,
      });
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Create schedule error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/schedules/:id/confirm", requireAuth, async (req: Request, res: Response) => {
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

  app.post("/api/medications/:id/take-dose", requireAuth, async (req: Request, res: Response) => {
    try {
      const medId = req.params.id;
      const userId = req.session.userId!;
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
        ownerId: userId,
      });

      if (med.currentStock > 0) {
        await storage.updateMedicationStock(medId, med.currentStock - 1);
      }

      const newStock = med.currentStock - 1;
      try {
        const conns = await storage.getConnectionsByDependent(userId);
        const acceptedConns = conns.filter(c => c.status === "ACCEPTED");
        const dependent = await storage.getUserById(userId);

        if (newStock === 0) {
          await storage.createNotification({
            userId,
            type: "STOCK_EMPTY",
            title: "Estoque Zerado",
            message: `${med.name} está sem estoque. Reponha o quanto antes.`,
            relatedId: medId,
          });
          if (dependent && acceptedConns.length > 0) {
            for (const conn of acceptedConns) {
              await storage.createNotification({
                userId: conn.masterId,
                type: "STOCK_EMPTY",
                title: "Estoque Zerado",
                message: `${dependent.name}: ${med.name} sem estoque`,
                relatedId: medId,
              });
            }
          }
        } else if (newStock > 0 && newStock <= med.alertThreshold) {
          await storage.createNotification({
            userId,
            type: "STOCK_LOW",
            title: "Estoque Baixo",
            message: `${med.name} com apenas ${newStock} unidades restantes`,
            relatedId: medId,
          });
          if (dependent && acceptedConns.length > 0) {
            for (const conn of acceptedConns) {
              await storage.createNotification({
                userId: conn.masterId,
                type: "STOCK_LOW",
                title: "Estoque Baixo",
                message: `${dependent.name}: ${med.name} com apenas ${newStock} unidades restantes`,
                relatedId: medId,
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
        status: "TAKEN",
      });
    } catch (error) {
      console.error("Take dose error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/connections", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      if (user.role === "MASTER") {
        const conns = await storage.getConnectionsByMaster(req.session.userId!);
        const enriched = [];
        for (const conn of conns) {
          const dep = await storage.getUserById(conn.dependentId);
          enriched.push({
            ...conn,
            linkedName: dep?.name || "Unknown",
            linkedEmail: dep?.email || "",
            linkedRole: dep?.role || "",
          });
        }
        res.json(enriched);
      } else {
        const conns = await storage.getConnectionsByDependent(req.session.userId!);
        const enriched = [];
        for (const conn of conns) {
          const master = await storage.getUserById(conn.masterId);
          enriched.push({
            ...conn,
            linkedName: master?.name || "Unknown",
            linkedEmail: master?.email || "",
            linkedRole: master?.role || "",
          });
        }
        res.json(enriched);
      }
    } catch (error) {
      console.error("Get connections error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/connections", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
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
        const count = await storage.getConnectionCount(req.session.userId!);
        if (count >= 1) {
          return res.status(403).json({
            message: "Plano FREE limitado a 1 conexao. Faca upgrade para PREMIUM.",
            requiresUpgrade: true,
          });
        }
      }

      const conn = await storage.createConnection(req.session.userId!, target.id);

      try {
        await storage.createNotification({
          userId: target.id,
          type: "CONNECTION_REQUEST",
          title: "Solicitação de Conexão",
          message: `${user.name} quer se conectar com você`,
          relatedId: conn.id,
        });
      } catch (notifError) {
        console.error("Notification error (create-connection):", notifError);
      }

      res.status(201).json({
        ...conn,
        linkedName: target.name,
        linkedEmail: target.email,
        linkedRole: target.role,
      });
    } catch (error) {
      console.error("Create connection error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/connections/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteConnection(req.params.id);
      res.json({ message: "Connection removed" });
    } catch (error) {
      console.error("Delete connection error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/connections/:id/accept", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.acceptConnection(req.params.id);

      try {
        const conns = await storage.getConnectionsByDependent(req.session.userId!);
        const conn = conns.find(c => c.id === req.params.id);
        if (conn) {
          const dependent = await storage.getUserById(conn.dependentId);
          if (dependent) {
            await storage.createNotification({
              userId: conn.masterId,
              type: "CONNECTION_ACCEPTED",
              title: "Conexão Aceita",
              message: `${dependent.name} aceitou sua conexão`,
              relatedId: conn.id,
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

  app.get("/api/dependents/:id/medications", requireAuth, async (req: Request, res: Response) => {
    try {
      const meds = await storage.getMedicationsByOwner(req.params.id);
      res.json(meds);
    } catch (error) {
      console.error("Get dependent medications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/dependents", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user || user.role !== "MASTER") {
        return res.status(403).json({ message: "Only MASTER users can view dependents" });
      }

      const dependents = await storage.getDependentsForMaster(req.session.userId!);
      const enriched = [];

      for (const dep of dependents) {
        const schedules = await storage.getSchedulesByOwner(dep.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.getTime();

        const todaySchedules = schedules.filter(s => s.timeMillis >= todayStart);
        const takenToday = todaySchedules.filter(s => s.status === "TAKEN").length;
        const missedToday = todaySchedules.filter(s => s.status === "MISSED").length;

        const meds = await storage.getMedicationsByOwner(dep.id);

        enriched.push({
          id: dep.id,
          name: dep.name,
          email: dep.email,
          role: dep.role,
          takenToday,
          missedToday,
          totalMeds: meds.length,
        });
      }

      res.json(enriched);
    } catch (error) {
      console.error("Get dependents error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/dependents/:id/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user || user.role !== "MASTER") {
        return res.status(403).json({ message: "Only MASTER users can view dependent history" });
      }

      const depId = req.params.id;
      const schedules = await storage.getSchedulesByOwnerWithStatus(depId, ["TAKEN", "MISSED"]);
      const meds = await storage.getMedicationsByOwner(depId);
      const medMap = new Map(meds.map(m => [m.id, m]));

      const enriched = schedules.map(s => ({
        ...s,
        medicationName: medMap.get(s.medId)?.name || "Remedio removido",
        medicationDosage: medMap.get(s.medId)?.dosage || "",
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Get dependent history error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const notifs = await storage.getNotificationsByUser(req.session.userId!);
      res.json(notifs);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req: Request, res: Response) => {
    try {
      const count = await storage.getUnreadCountByUser(req.session.userId!);
      res.json({ count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/notifications/read-all", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.markAllNotificationsRead(req.session.userId!);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/push-tokens", requireAuth, async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Token is required" });
      }
      const pushToken = await storage.registerPushToken(req.session.userId!, token);
      res.status(201).json(pushToken);
    } catch (error) {
      console.error("Register push token error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
