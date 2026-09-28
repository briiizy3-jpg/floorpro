import type { IncomingMessage, ServerResponse } from "http";
import express from "express";
import { registerRoutes } from "../server/routes";

// Disable Vercel body parsing so Express can handle it
// (needed for Stripe webhook signature verification with express.raw)
export const config = {
  api: { bodyParser: false },
};

const app = express();

// JSON middleware with raw body capture (for Stripe webhook)
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: false }));

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  await registerRoutes({} as any, app);
  initialized = true;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ensureInitialized();
  (app as any)(req, res);
}
