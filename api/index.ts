import type { IncomingMessage, ServerResponse } from "http";

// Re-export the config from the bundled serverless function
const handler = require("./index.cjs");

export const config = (handler as any).config || { api: { bodyParser: false } };
export default (handler as any).default || handler;
