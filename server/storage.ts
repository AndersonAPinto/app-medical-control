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
import { eq, and, desc } from "drizzle-orm";
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
  updateUser(id: string, data: Partial<Pick<User, "name" | "email" | "role" | "planType">>): Promise<User>;
  getMedicationsByOwner(ownerId: string): Promise<Medication[]>;
  getMedicationById(id: string): Promise<Medication | undefined>;
  createMedication(med: InsertMedication & { ownerId: string }): Promise<Medication>;
  updateMedication(id: string, ownerId: string, data: Partial<Pick<Medication, "name" | "dosage" | "currentStock" | "alertThreshold" | "intervalInHours">>): Promise<Medication>;
  deleteMedication(id: string, ownerId: string): Promise<void>;
  updateMedicationStock(id: string, newStock: number): Promise<void>;
  getSchedulesByOwner(ownerId: string): Promise<DoseSchedule[]>;
  getConfirmedSchedulesByOwner(ownerId: string): Promise<DoseSchedule[]>;
  createSchedule(schedule: Omit<DoseSchedule, "id">): Promise<DoseSchedule>;
  updateScheduleStatus(id: string, status: string, confirmedAt?: number): Promise<void>;
  createConnection(masterId: string, dependentId: string): Promise<Connection>;
  getConnectionsByMaster(masterId: string): Promise<Connection[]>;
  getConnectionsByDependent(dependentId: string): Promise<Connection[]>;
  getConnectionCount(masterId: string): Promise<number>;
  acceptConnection(id: string): Promise<void>;
  deleteConnection(id: string): Promise<void>;
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

  async updateUser(id: string, data: Partial<Pick<User, "name" | "email" | "role" | "planType">>): Promise<User> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getMedicationsByOwner(ownerId: string): Promise<Medication[]> {
    return db.select().from(medications).where(eq(medications.ownerId, ownerId));
  }

  async getMedicationById(id: string): Promise<Medication | undefined> {
    const [med] = await db.select().from(medications).where(eq(medications.id, id));
    return med;
  }

  async createMedication(med: InsertMedication & { ownerId: string }): Promise<Medication> {
    const [created] = await db.insert(medications).values(med).returning();
    return created;
  }

  async updateMedication(id: string, ownerId: string, data: Partial<Pick<Medication, "name" | "dosage" | "currentStock" | "alertThreshold" | "intervalInHours">>): Promise<Medication> {
    const [updated] = await db.update(medications).set(data).where(and(eq(medications.id, id), eq(medications.ownerId, ownerId))).returning();
    return updated;
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

  async getConfirmedSchedulesByOwner(ownerId: string): Promise<DoseSchedule[]> {
    return db.select().from(doseSchedules)
      .where(and(eq(doseSchedules.ownerId, ownerId), eq(doseSchedules.status, "TAKEN")))
      .orderBy(desc(doseSchedules.confirmedAt));
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

  async deleteConnection(id: string): Promise<void> {
    await db.delete(connections).where(eq(connections.id, id));
  }

  async getSchedulesByOwnerWithStatus(ownerId: string, statuses: string[]): Promise<DoseSchedule[]> {
    const allSchedules = await db.select().from(doseSchedules).where(eq(doseSchedules.ownerId, ownerId)).orderBy(desc(doseSchedules.timeMillis));
    return allSchedules.filter(s => statuses.includes(s.status));
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
