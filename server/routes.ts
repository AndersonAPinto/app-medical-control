import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertMedicationSchema, insertConnectionSchema } from "@shared/schema";
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
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "medcontrol-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
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

  app.get("/api/medications", requireAuth, async (req: Request, res: Response) => {
    try {
      const meds = await storage.getMedicationsByOwner(req.session.userId!);
      res.json(meds);
    } catch (error) {
      console.error("Get medications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/medications", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = insertMedicationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
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

  app.delete("/api/medications/:id", requireAuth, async (req: Request, res: Response) => {
    try {
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
      await storage.updateScheduleStatus(req.params.id, "TAKEN", Date.now());
      res.json({ message: "Dose confirmed" });
    } catch (error) {
      console.error("Confirm dose error:", error);
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
            dependentName: dep?.name || "Unknown",
            dependentEmail: dep?.email || "",
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
            masterName: master?.name || "Unknown",
            masterEmail: master?.email || "",
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
      if (!user || user.role !== "MASTER") {
        return res.status(403).json({ message: "Only MASTER users can add dependents" });
      }

      if (user.planType === "FREE") {
        const count = await storage.getConnectionCount(req.session.userId!);
        if (count >= 1) {
          return res.status(403).json({ message: "FREE plan limited to 1 dependent. Upgrade to PREMIUM." });
        }
      }

      const parsed = insertConnectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data" });
      }

      const dependent = await storage.getUserByEmail(parsed.data.dependentId);
      if (!dependent) {
        return res.status(404).json({ message: "User not found with that email" });
      }

      if (dependent.role !== "DEPENDENT") {
        return res.status(400).json({ message: "Target user is not a DEPENDENT" });
      }

      const conn = await storage.createConnection(req.session.userId!, dependent.id);
      res.status(201).json(conn);
    } catch (error) {
      console.error("Create connection error:", error);
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

  const httpServer = createServer(app);
  return httpServer;
}
