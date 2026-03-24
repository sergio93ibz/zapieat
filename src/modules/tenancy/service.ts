/**
 * Tenancy Module — src/modules/tenancy/service.ts
 *
 * Single source of truth for tenant resolution.
 * Used by: middleware.ts, API routes, Server Components.
 *
 * Flow:
 *   1. Check Redis cache (tenant:{domain})
 *   2. On miss → query PostgreSQL via Prisma
 *   3. Store result in Redis with TTL
 */

import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"

const TENANT_CACHE_PREFIX = "tenant:"
const TENANT_CACHE_TTL_SECONDS = 3600 // 1 hour

export interface TenantInfo {
  id: string          // Restaurant.id
  slug: string        // Restaurant.slug
  status: string      // Restaurant.status
  name: string
  logoUrl: string | null
}

/**
 * Resolves a tenant from a given domain string.
 * Checks Redis first; falls back to PostgreSQL.
 */
export async function getTenantByDomain(
  domain: string
): Promise<TenantInfo | null> {
  // 1. Normalise: strip port, lowercase
  const normalisedDomain = domain.split(":")[0].toLowerCase()

  // 2. Try Redis cache
  const cached = await getCachedTenant(normalisedDomain)
  if (cached) return cached

  // 3. Cache miss — resolve from PostgreSQL
  const tenant = await resolveTenantFromDb(normalisedDomain)
  if (!tenant) return null

  // 4. Cache for next request
  await cacheTenant(normalisedDomain, tenant)

  return tenant
}

/**
 * Stores a resolved tenant in Redis.
 */
export async function cacheTenant(
  domain: string,
  tenant: TenantInfo
): Promise<void> {
  try {
    await redis.setex(
      `${TENANT_CACHE_PREFIX}${domain}`,
      TENANT_CACHE_TTL_SECONDS,
      JSON.stringify(tenant)
    )
  } catch (err) {
    // Non-fatal — just log; the app will resolve from DB on next request
    console.warn("[Tenancy] Failed to cache tenant:", err)
  }
}

/**
 * Removes a tenant from the Redis cache.
 * Call this when a domain is verified, updated, or removed.
 */
export async function invalidateTenantCache(domain: string): Promise<void> {
  try {
    await redis.del(`${TENANT_CACHE_PREFIX}${domain}`)
  } catch (err) {
    console.warn("[Tenancy] Failed to invalidate tenant cache:", err)
  }
}

// ─── Private helpers ─────────────────────────────────────────

async function getCachedTenant(domain: string): Promise<TenantInfo | null> {
  try {
    const cached = await redis.get(`${TENANT_CACHE_PREFIX}${domain}`)
    if (!cached) return null
    return JSON.parse(cached) as TenantInfo
  } catch {
    return null
  }
}

async function resolveTenantFromDb(domain: string): Promise<TenantInfo | null> {
  // Build the subdomain slug from pattern: {slug}.<base-domain>
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "zapieat.com"
  const isSubdomain = domain.endsWith(`.${baseDomain}`)

  let restaurant: {
    id: string
    slug: string
    status: string
    name: string
    logoUrl: string | null
  } | null = null

  if (isSubdomain) {
    // Extract slug from subdomain: "pizzaroma.<base-domain>" → "pizzaroma"
    const slug = domain.replace(`.${baseDomain}`, "")
    restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, slug: true, status: true, name: true, logoUrl: true },
    })
  } else {
    // Check custom domains table
    const domainRecord = await prisma.domain.findFirst({
      where: { domain, verified: true },
      include: {
        restaurant: {
          select: { id: true, slug: true, status: true, name: true, logoUrl: true },
        },
      },
    })
    restaurant = domainRecord?.restaurant ?? null
  }

  if (!restaurant) return null

  return {
    id: restaurant.id,
    slug: restaurant.slug,
    status: restaurant.status,
    name: restaurant.name,
    logoUrl: restaurant.logoUrl,
  }
}
