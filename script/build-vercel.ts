import { build as esbuild } from "esbuild";
import { readFile } from "node:fs/promises";

async function buildVercel() {
  console.log("Building Vercel serverless function...");
  
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
  const allowlist = ["@supabase/supabase-js", "dotenv", "express", "stripe", "ws", "zod", "zod-validation-error", "drizzle-orm", "drizzle-zod"];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/vercel-handler.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "api/index.js",
    target: "node20",
    minify: true,
    external: externals,
    logLevel: "info",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  
  console.log("Done building serverless function");
}

buildVercel().catch((err) => { console.error(err); process.exit(1); });
