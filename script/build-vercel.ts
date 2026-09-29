import { build as esbuild } from "esbuild";

async function buildVercel() {
  console.log("Building Vercel serverless function...");
  
  // Bundle the serverless function with all server code inlined
  // External: only Node.js built-ins
  await esbuild({
    entryPoints: ["api/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "api/index.cjs",
    target: "node20",
    minify: true,
    external: [],
    logLevel: "info",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });
  
  console.log("Done building serverless function");
}

buildVercel().catch((err) => {
  console.error(err);
  process.exit(1);
});
