import {
  type User,
  type InsertUser,
  type Medication,
  type InsertMedication,
  type DoseSchedule,
  type Connection,
  users,
  medications,
  doseSchedules,
  connections,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, and, or } from "drizzle-orm";
import ws from "ws";
import { Pool, neonConfig } from "@neondatabase/serverless";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export interface IStorage {
  createUser(user: InsertUser & { password: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getMedicationsByOwner(ownerId: string): Promise<Medication[]>;
  createMedication(med: InsertMedication & { ownerId: string }): Promise<Medication>;
  deleteMedication(id: string, ownerId: string): Promise<void>;
  updateMedicationStock(id: string, newStock: number): Promise<void>;
  getSchedulesByOwner(ownerId: string): Promise<DoseSchedule[]>;
  createSchedule(schedule: Omit<DoseSchedule, "id">): Promise<DoseSchedule>;
  updateScheduleStatus(id: string, status: string, confirmedAt?: number): Promise<void>;
  createConnection(masterId: string, dependentId: string): Promise<Connection>;
  getConnectionsByMaster(masterId: string): Promise<Connection[]>;
  getConnectionsByDependent(dependentId: string): Promise<Connection[]>;
  getConnectionCount(masterId: string): Promise<number>;
  acceptConnection(id: string): Promise<void>;
  getDependentsForMaster(masterId: string): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async createUser(user: InsertUser & { password: string }): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getMedicationsByOwner(ownerId: string): Promise<Medication[]> {
    return db.select().from(medications).where(eq(medications.ownerId, ownerId));
  }

  async createMedication(med: InsertMedication & { ownerId: string }): Promise<Medication> {
    const [created] = await db.insert(medications).values(med).returning();
    return created;
  }

  async deleteMedication(id: string, ownerId: string): Promise<void> {
    await db.delete(medications).where(and(eq(medications.id, id), eq(medications.ownerId, ownerId)));
  }

  async updateMedicationStock(id: string, newStock: number): Promise<void> {
    await db.update(medications).set({ currentStock: newStock }).where(eq(medications.id, id));
  }

  async getSchedulesByOwner(ownerId: string): Promise<DoseSchedule[]> {
    return db.select().from(doseSchedules).where(eq(doseSchedules.ownerId, ownerId));
  }

  async createSchedule(schedule: Omit<DoseSchedule, "id">): Promise<DoseSchedule> {
    const [created] = await db.insert(doseSchedules).values(schedule).returning();
    return created;
  }

  async updateScheduleStatus(id: string, status: string, confirmedAt?: number): Promise<void> {
    await db.update(doseSchedules).set({ status, confirmedAt: confirmedAt ?? null }).where(eq(doseSchedules.id, id));
  }

  async createConnection(masterId: string, dependentId: string): Promise<Connection> {
    const [created] = await db.insert(connections).values({ masterId, dependentId }).returning();
    return created;
  }

  async getConnectionsByMaster(masterId: string): Promise<Connection[]> {
    return db.select().from(connections).where(eq(connections.masterId, masterId));
  }

  async getConnectionsByDependent(dependentId: string): Promise<Connection[]> {
    return db.select().from(connections).where(eq(connections.dependentId, dependentId));
  }

  async getConnectionCount(masterId: string): Promise<number> {
    const conns = await db.select().from(connections).where(eq(connections.masterId, masterId));
    return conns.length;
  }

  async acceptConnection(id: string): Promise<void> {
    await db.update(connections).set({ status: "ACCEPTED" }).where(eq(connections.id, id));
  }

  async getDependentsForMaster(masterId: string): Promise<User[]> {
    const conns = await this.getConnectionsByMaster(masterId);
    const acceptedConns = conns.filter(c => c.status === "ACCEPTED");
    const dependents: User[] = [];
    for (const conn of acceptedConns) {
      const user = await this.getUserById(conn.dependentId);
      if (user) dependents.push(user);
    }
    return dependents;
  }
}

export const storage = new DatabaseStorage();
