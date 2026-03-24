import { defineConfig } from "prisma/config"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npm run prisma-seed",
  },
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
})
