/**
 * proxy.ts — Multi-tenant resolver (Next.js 16)
 *
 * NOTE: This file runs on the Edge runtime.
 * Do not import Prisma/pg/ioredis (Node-only). If we need tenant data,
 * resolve it via an internal API route that runs on Node.
 */

import { NextRequest, NextResponse } from "next/server"

type TenantInfo = {
  id: string
  slug: string
  status: string
  name: string
  logoUrl: string | null
}

// Routes that should be excluded from proxy logic
const BYPASS_PATHS = [
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/api\/auth\//,
  /^\/api\/tenancy\//,
]

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "zapieat.com"

function normalizeHost(host: string): string {
  return host.split(":")[0].toLowerCase()
}

function isAdminHost(host: string): boolean {
  if (!host) return true

  // Local dev: allow platform admin on localhost
  if (host === "localhost" || host === "127.0.0.1") return true

  // Base domain and admin subdomain are platform-level
  if (host === BASE_DOMAIN) return true
  if (host === `admin.${BASE_DOMAIN}`) return true

  return false
}

async function resolveTenant(request: NextRequest, host: string): Promise<TenantInfo | null> {
  // IMPORTANT: In production we sit behind Nginx TLS termination.
  // Some runtimes may report request.url as https://..., but the app server only
  // listens on plain HTTP (port 3000). Build the resolver URL explicitly.
  const resolverOrigin =
    process.env.TENANCY_RESOLVER_ORIGIN ??
    // Fallback to the request origin (works in local dev)
    request.nextUrl.origin

  const url = new URL("/api/tenancy/resolve", resolverOrigin)
  url.searchParams.set("domain", host)

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "x-zasfood-proxy": "1",
    },
  })

  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Tenant resolver returned ${res.status}`)
  }

  return (await res.json()) as TenantInfo
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (BYPASS_PATHS.some((p) => p.test(pathname))) {
    return NextResponse.next()
  }

  const hostHeader = request.headers.get("host") ?? ""
  const host = normalizeHost(hostHeader)

  // ── Tenant resolution (only for non-admin hosts) ─────────────
  if (!isAdminHost(host)) {
    try {
      const tenant = await resolveTenant(request, host)
      if (!tenant) {
        return new NextResponse("Restaurant not found", { status: 404 })
      }

      if (tenant.status === "SUSPENDED") {
        return new NextResponse("This restaurant is temporarily unavailable", {
          status: 503,
        })
      }

      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-tenant-id", tenant.id)
      requestHeaders.set("x-tenant-slug", tenant.slug)
      requestHeaders.set("x-tenant-status", tenant.status)

      return NextResponse.next({ request: { headers: requestHeaders } })
    } catch (err) {
      console.error("[Proxy] Tenant resolution failed:", err)
      return new NextResponse("Tenant resolution failed", { status: 503 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
