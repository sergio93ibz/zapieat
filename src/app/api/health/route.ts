import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"

// Forzar ejecución dinámica — no ejecutar en build time
export const dynamic = "force-dynamic"

// GET /api/health
export async function GET() {
  const startedAt = Date.now()

  let dbOk = false
  let redisOk = false

  try {
    await prisma.$queryRaw`SELECT 1`
    dbOk = true
  } catch {
    dbOk = false
  }

  try {
    const pong = await redis.ping()
    redisOk = pong === "PONG"
  } catch {
    redisOk = false
  }

  const ok = dbOk && redisOk
  return NextResponse.json(
    {
      ok,
      db: dbOk,
      redis: redisOk,
      uptimeSeconds: Math.floor(process.uptime()),
      latencyMs: Date.now() - startedAt,
    },
    { status: ok ? 200 : 503 }
  )
}
