import { redis } from "@/lib/redis"

export async function rateLimit(params: {
  key: string
  limit: number
  windowSeconds: number
}): Promise<{ ok: boolean; remaining: number; resetSeconds: number }>{
  const redisKey = `rl:${params.key}`

  try {
    const multi = redis.multi()
    multi.incr(redisKey)
    multi.ttl(redisKey)
    multi.expire(redisKey, params.windowSeconds, "NX")

    const res = (await multi.exec()) ?? []
    const count = Number(res[0]?.[1] ?? 0)
    const ttl = Number(res[1]?.[1] ?? params.windowSeconds)
    const resetSeconds = ttl > 0 ? ttl : params.windowSeconds

    return {
      ok: count <= params.limit,
      remaining: Math.max(0, params.limit - count),
      resetSeconds,
    }
  } catch (err) {
    // Fail open: do not block traffic if Redis is down.
    console.warn("[rateLimit] failed", err)
    return { ok: true, remaining: params.limit, resetSeconds: params.windowSeconds }
  }
}
