import type { IncomingMessage, ServerResponse } from "http";
import express from "express";
import { registerRoutes } from "./routes";

const app = express();

app.use(express.json({
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: false }));

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  await registerRoutes({} as any, app);
  initialized = true;
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ensureInitialized();
  (app as any)(req, res);
}
