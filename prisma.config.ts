import { defineConfig } from "prisma/config"
import dotenv from "dotenv"
import fs from "node:fs"

// Load env for Prisma CLI:
// - docker-compose typically provides `.env`
// - local dev typically uses `.env.local`
dotenv.config({ path: ".env" })
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local", override: true })
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npm run prisma-seed",
  },
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
})
