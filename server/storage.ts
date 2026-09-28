import { supabase } from "./supabase";
import type { User, Project, Room, Subscription, InsertProject, InsertRoom, InsertSubscription, InsertUser } from "@shared/schema";

// Map Supabase snake_case rows to camelCase types
function mapUser(row: any): User {
  if (!row) return undefined as any;
  return {
    id: row.id, username: row.username, password: row.password, email: row.email,
    plan: row.plan, subscriptionStatus: row.subscription_status, trialEndsAt: row.trial_ends_at,
    stripeCustomerId: row.stripe_customer_id, stripeSubscriptionId: row.stripe_subscription_id,
    createdAt: row.created_at,
  } as User;
}
function mapProject(row: any): Project {
  if (!row) return undefined as any;
  return {
    id: row.id, userId: row.user_id, name: row.name, clientName: row.client_name,
    clientAddress: row.client_address, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at,
  } as Project;
}
function mapRoom(row: any): Room {
  if (!row) return undefined as any;
  return {
    id: row.id, projectId: row.project_id, name: row.name, width: row.width, length: row.length,
    shape: row.shape, materialType: row.material_type, materialWidth: row.material_width,
    materialLength: row.material_length, pattern: row.pattern, wasteFactor: row.waste_factor,
    pricePerUnit: row.price_per_unit, laborPerSqft: row.labor_per_sqft, layoutData: row.layout_data,
    createdAt: row.created_at,
  } as Room;
}
function mapSubscription(row: any): Subscription {
  if (!row) return undefined as any;
  return {
    id: row.id, userId: row.user_id, plan: row.plan, amount: row.amount, status: row.status,
    stripeSubscriptionId: row.stripe_subscription_id, stripeCustomerId: row.stripe_customer_id,
    startDate: row.start_date, endDate: row.end_date, createdAt: row.created_at,
  } as Subscription;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPlan(userId: number, plan: string, status: string, trialEndsAt?: string): Promise<User | undefined>;
  updateUserStripeIds(userId: number, customerId: string, subscriptionId: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  getProjects(userId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;
  getRooms(projectId: number): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, data: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<void>;
  getSubscriptions(userId: number): Promise<Subscription[]>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  cancelSubscription(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ─── Users ───
  async getUser(id: number): Promise<User | undefined> {
    const { data } = await supabase.from("users").select("*").eq("id", id).single();
    return mapUser(data);
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data } = await supabase.from("users").select("*").eq("username", username).single();
    return mapUser(data);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const { data } = await supabase.from("users").insert({
      username: insertUser.username, password: insertUser.password, email: insertUser.email,
    }).select().single();
    return mapUser(data);
  }
  async updateUserPlan(userId: number, plan: string, status: string, trialEndsAt?: string): Promise<User | undefined> {
    const updateData: Record<string, unknown> = { plan, subscription_status: status };
    if (trialEndsAt) updateData.trial_ends_at = trialEndsAt;
    const { data } = await supabase.from("users").update(updateData).eq("id", userId).select().single();
    return mapUser(data);
  }
  async updateUserStripeIds(userId: number, customerId: string, subscriptionId: string): Promise<User | undefined> {
    const { data } = await supabase.from("users").update({
      stripe_customer_id: customerId, stripe_subscription_id: subscriptionId,
    }).eq("id", userId).select().single();
    return mapUser(data);
  }
  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const { data } = await supabase.from("users").select("*").eq("stripe_customer_id", customerId).single();
    return mapUser(data);
  }

  // ─── Projects ───
  async getProjects(userId: number): Promise<Project[]> {
    const { data } = await supabase.from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return (data || []).map(mapProject);
  }
  async getProject(id: number): Promise<Project | undefined> {
    const { data } = await supabase.from("projects").select("*").eq("id", id).single();
    return mapProject(data);
  }
  async createProject(insertProject: InsertProject): Promise<Project> {
    const { data } = await supabase.from("projects").insert({
      user_id: insertProject.userId, name: insertProject.name,
      client_name: insertProject.clientName, client_address: insertProject.clientAddress, notes: insertProject.notes,
    }).select().single();
    return mapProject(data);
  }
  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.clientName !== undefined) updateData.client_name = data.clientName;
    if (data.clientAddress !== undefined) updateData.client_address = data.clientAddress;
    if (data.notes !== undefined) updateData.notes = data.notes;
    const { data: result } = await supabase.from("projects").update(updateData).eq("id", id).select().single();
    return mapProject(result);
  }
  async deleteProject(id: number): Promise<void> {
    await supabase.from("projects").delete().eq("id", id);
  }

  // ─── Rooms ───
  async getRooms(projectId: number): Promise<Room[]> {
    const { data } = await supabase.from("rooms").select("*").eq("project_id", projectId).order("created_at", { ascending: true });
    return (data || []).map(mapRoom);
  }
  async getRoom(id: number): Promise<Room | undefined> {
    const { data } = await supabase.from("rooms").select("*").eq("id", id).single();
    return mapRoom(data);
  }
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const { data } = await supabase.from("rooms").insert({
      project_id: insertRoom.projectId, name: insertRoom.name, width: insertRoom.width, length: insertRoom.length,
      shape: insertRoom.shape, material_type: insertRoom.materialType, material_width: insertRoom.materialWidth,
      material_length: insertRoom.materialLength, pattern: insertRoom.pattern, waste_factor: insertRoom.wasteFactor,
      price_per_unit: insertRoom.pricePerUnit, labor_per_sqft: insertRoom.laborPerSqft, layout_data: insertRoom.layoutData,
    }).select().single();
    return mapRoom(data);
  }
  async updateRoom(id: number, data: Partial<InsertRoom>): Promise<Room | undefined> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.width !== undefined) updateData.width = data.width;
    if (data.length !== undefined) updateData.length = data.length;
    if (data.shape !== undefined) updateData.shape = data.shape;
    if (data.materialType !== undefined) updateData.material_type = data.materialType;
    if (data.materialWidth !== undefined) updateData.material_width = data.materialWidth;
    if (data.materialLength !== undefined) updateData.material_length = data.materialLength;
    if (data.pattern !== undefined) updateData.pattern = data.pattern;
    if (data.wasteFactor !== undefined) updateData.waste_factor = data.wasteFactor;
    if (data.pricePerUnit !== undefined) updateData.price_per_unit = data.pricePerUnit;
    if (data.laborPerSqft !== undefined) updateData.labor_per_sqft = data.laborPerSqft;
    if (data.layoutData !== undefined) updateData.layout_data = data.layoutData;
    const { data: result } = await supabase.from("rooms").update(updateData).eq("id", id).select().single();
    return mapRoom(result);
  }
  async deleteRoom(id: number): Promise<void> {
    await supabase.from("rooms").delete().eq("id", id);
  }

  // ─── Subscriptions ───
  async getSubscriptions(userId: number): Promise<Subscription[]> {
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return (data || []).map(mapSubscription);
  }
  async createSubscription(insertSub: InsertSubscription): Promise<Subscription> {
    const { data } = await supabase.from("subscriptions").insert({
      user_id: insertSub.userId, plan: insertSub.plan, amount: insertSub.amount, status: insertSub.status,
      stripe_subscription_id: insertSub.stripeSubscriptionId, stripe_customer_id: insertSub.stripeCustomerId,
    }).select().single();
    return mapSubscription(data);
  }
  async cancelSubscription(userId: number): Promise<void> {
    await supabase.from("subscriptions").update({ status: "cancelled" }).eq("user_id", userId);
  }
}

export const storage = new DatabaseStorage();
