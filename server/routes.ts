import type { Express } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import { insertUserSchema, insertProjectSchema, insertRoomSchema, insertSubscriptionSchema } from "@shared/schema";

// Simple in-memory session (no cookies/localStorage in sandbox)
const sessions = new Map<string, number>(); // token -> userId

function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getUserId(req: any): number | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.substring(7);
  return sessions.get(token) ?? null;
}

export async function registerRoutes(
  _httpServer: Server,
  app: Express
): Promise<Server> {
  // ─── Auth ───
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByUsername(parsed.username);
      if (existing) {
        return res.status(400).json({ error: "Username already taken" });
      }
      const user = await storage.createUser(parsed);
      const token = generateToken();
      sessions.set(token, user.id);
      res.json({ token, user: { id: user.id, username: user.username, email: user.email, plan: user.plan, subscriptionStatus: user.subscriptionStatus } });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = generateToken();
    sessions.set(token, user.id);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, plan: user.plan, subscriptionStatus: user.subscriptionStatus, trialEndsAt: user.trialEndsAt } });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    res.json({ id: user.id, username: user.username, email: user.email, plan: user.plan, subscriptionStatus: user.subscriptionStatus, trialEndsAt: user.trialEndsAt });
  });

  // ─── Projects ───
  app.get("/api/projects", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const result = await storage.getProjects(userId);
    res.json(result);
  });

  app.get("/api/projects/:id", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const project = await storage.getProject(parseInt(req.params.id));
    if (!project || project.userId !== userId) return res.status(404).json({ error: "Not found" });
    res.json(project);
  });

  app.post("/api/projects", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    // Check free plan project limit
    const user = await storage.getUser(userId);
    if (user && user.plan === "free") {
      const existing = await storage.getProjects(userId);
      if (existing.length >= 3) {
        return res.status(403).json({ error: "Free plan limited to 3 projects. Upgrade to Pro for unlimited." });
      }
    }
    try {
      const parsed = insertProjectSchema.parse({ ...req.body, userId });
      const project = await storage.createProject(parsed);
      res.json(project);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const project = await storage.getProject(parseInt(req.params.id));
    if (!project || project.userId !== userId) return res.status(404).json({ error: "Not found" });
    const updated = await storage.updateProject(parseInt(req.params.id), req.body);
    res.json(updated);
  });

  app.delete("/api/projects/:id", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const project = await storage.getProject(parseInt(req.params.id));
    if (!project || project.userId !== userId) return res.status(404).json({ error: "Not found" });
    await storage.deleteProject(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ─── Rooms ───
  app.get("/api/projects/:id/rooms", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const project = await storage.getProject(parseInt(req.params.id));
    if (!project || project.userId !== userId) return res.status(404).json({ error: "Not found" });
    const result = await storage.getRooms(parseInt(req.params.id));
    res.json(result);
  });

  app.post("/api/projects/:id/rooms", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const project = await storage.getProject(parseInt(req.params.id));
    if (!project || project.userId !== userId) return res.status(404).json({ error: "Not found" });

    // Check pattern access — free plan can only use straight
    const user = await storage.getUser(userId);
    const pattern = req.body.pattern || "straight";
    if (user && user.plan === "free" && pattern !== "straight") {
      return res.status(403).json({ error: `${pattern} pattern requires Pro subscription` });
    }

    try {
      const parsed = insertRoomSchema.parse({ ...req.body, projectId: parseInt(req.params.id) });
      const room = await storage.createRoom(parsed);
      res.json(room);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/rooms/:id", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const room = await storage.getRoom(parseInt(req.params.id));
    if (!room) return res.status(404).json({ error: "Not found" });
    const project = await storage.getProject(room.projectId);
    if (!project || project.userId !== userId) return res.status(404).json({ error: "Not found" });

    // Check pattern access
    const user = await storage.getUser(userId);
    const pattern = req.body.pattern;
    if (user && user.plan === "free" && pattern && pattern !== "straight") {
      return res.status(403).json({ error: `${pattern} pattern requires Pro subscription` });
    }

    const updated = await storage.updateRoom(parseInt(req.params.id), req.body);
    res.json(updated);
  });

  app.delete("/api/rooms/:id", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const room = await storage.getRoom(parseInt(req.params.id));
    if (!room) return res.status(404).json({ error: "Not found" });
    const project = await storage.getProject(room.projectId);
    if (!project || project.userId !== userId) return res.status(404).json({ error: "Not found" });
    await storage.deleteRoom(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ─── Subscriptions ───
  app.post("/api/subscribe", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { plan } = req.body; // pro | enterprise
    if (!plan || !["pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }
    const amounts: Record<string, number> = { pro: 29, enterprise: 99 };
    const sub = await storage.createSubscription({
      userId,
      plan,
      amount: amounts[plan],
      status: "active",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await storage.updateUserPlan(userId, plan, "active");
    const user = await storage.getUser(userId);
    res.json({
      subscription: sub,
      user: user ? { id: user.id, username: user.username, plan: user.plan, subscriptionStatus: user.subscriptionStatus } : null,
    });
  });

  app.post("/api/subscribe/trial", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { plan } = req.body;
    if (!plan || !["pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    await storage.updateUserPlan(userId, plan, "trial", trialEnd);
    const user = await storage.getUser(userId);
    res.json({
      user: user ? { id: user.id, username: user.username, plan: user.plan, subscriptionStatus: user.subscriptionStatus, trialEndsAt: user.trialEndsAt } : null,
    });
  });

  app.post("/api/subscribe/cancel", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    await storage.cancelSubscription(userId);
    await storage.updateUserPlan(userId, "free", "inactive");
    res.json({ success: true });
  });

  app.get("/api/subscriptions", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const result = await storage.getSubscriptions(userId);
    res.json(result);
  });

  return _httpServer;
}
