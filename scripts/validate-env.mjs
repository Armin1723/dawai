#!/usr/bin/env node
/**
 * Validate required environment variables before build/deploy.
 * Usage: node scripts/validate-env.mjs
 * Exits non-zero when required vars are missing.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const optional = ["SUPABASE_SERVICE_ROLE_KEY", "OPENROUTER_API_KEY", "OPENROUTER_MODEL"];

function loadEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env"]) {
    const p = path.resolve(process.cwd(), file);
    if (existsSync(p)) {
      for (const line of readFileSync(p, "utf8").split("\n")) {
        const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
        if (m && !m[1].startsWith("#") && !(m[1] in env)) {
          env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const missing = required.filter((k) => !env[k]);
const missingOptional = optional.filter((k) => !env[k]);

if (missing.length > 0) {
  console.error(`❌ Missing required env vars: ${missing.join(", ")}`);
  console.error("   Copy .env.example → .env.local and fill in your Supabase project values.");
  process.exit(1);
}

console.log("✅ Required env vars present.");
if (missingOptional.length > 0) {
  console.log(`ℹ️  Optional (not set): ${missingOptional.join(", ")}`);
}
