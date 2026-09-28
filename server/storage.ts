import { users, projects, rooms, subscriptions } from '@shared/schema';
import type { User, InsertUser, Project, InsertProject, Room, InsertRoom, Subscription, InsertSubscription } from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPlan(userId: number, plan: string, status: string, trialEndsAt?: string): Promise<User | undefined>;
  // Projects
  getProjects(userId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;
  // Rooms
  getRooms(projectId: number): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, data: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<void>;
  // Subscriptions
  getSubscriptions(userId: number): Promise<Subscription[]>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  cancelSubscription(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ─── Users ───
  async getUser(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return db.insert(users).values(insertUser).returning().get();
  }

  async updateUserPlan(userId: number, plan: string, status: string, trialEndsAt?: string): Promise<User | undefined> {
    const updateData: Record<string, unknown> = { plan, subscriptionStatus: status };
    if (trialEndsAt) updateData.trialEndsAt = trialEndsAt;
    return db.update(users).set(updateData).where(eq(users.id, userId)).returning().get();
  }

  // ─── Projects ───
  async getProjects(userId: number): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.userId, userId)).all();
  }

  async getProject(id: number): Promise<Project | undefined> {
    return db.select().from(projects).where(eq(projects.id, id)).get();
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    return db.insert(projects).values(insertProject).returning().get();
  }

  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    const updateData = { ...data, updatedAt: new Date().toISOString() };
    return db.update(projects).set(updateData).where(eq(projects.id, id)).returning().get();
  }

  async deleteProject(id: number): Promise<void> {
    db.delete(projects).where(eq(projects.id, id)).run();
  }

  // ─── Rooms ───
  async getRooms(projectId: number): Promise<Room[]> {
    return db.select().from(rooms).where(eq(rooms.projectId, projectId)).all();
  }

  async getRoom(id: number): Promise<Room | undefined> {
    return db.select().from(rooms).where(eq(rooms.id, id)).get();
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    return db.insert(rooms).values(insertRoom).returning().get();
  }

  async updateRoom(id: number, data: Partial<InsertRoom>): Promise<Room | undefined> {
    return db.update(rooms).set(data).where(eq(rooms.id, id)).returning().get();
  }

  async deleteRoom(id: number): Promise<void> {
    db.delete(rooms).where(eq(rooms.id, id)).run();
  }

  // ─── Subscriptions ───
  async getSubscriptions(userId: number): Promise<Subscription[]> {
    return db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).all();
  }

  async createSubscription(insertSub: InsertSubscription): Promise<Subscription> {
    return db.insert(subscriptions).values(insertSub).returning().get();
  }

  async cancelSubscription(userId: number): Promise<void> {
    db.update(subscriptions).set({ status: 'cancelled' }).where(eq(subscriptions.userId, userId)).run();
  }
}

export const storage = new DatabaseStorage();
