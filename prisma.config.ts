import { defineConfig } from "prisma/config"
import dotenv from "dotenv"
import fs from "node:fs"

// Load env for Prisma CLI:
// - docker-compose typically provides `.env`
// - local dev typically uses `.env.local`
// Note: dotenv does NOT override variables already set in the environment
// so Docker build ARGs take precedence over .env files
if (fs.existsSync(".env")) {
  dotenv.config({ path: ".env" })
}
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local", override: true })
}

// Fallback placeholder so `prisma generate` works at build time
// without a real database connection (generate only reads the schema)
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npm run prisma-seed",
  },
  datasource: {
    url: databaseUrl,
  },
})
