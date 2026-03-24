/**
 * proxy.ts — Multi-tenant resolver (Next.js 16)
 *
 * NOTE: This file runs on the Edge runtime.
 * Do not import Prisma/pg/ioredis (Node-only). If we need tenant data,
 * resolve it via an internal API route that runs on Node.
 */

import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

type TenantInfo = {
  id: string
  slug: string
  status: string
  name: string
  logoUrl: string | null
}

// Routes that require authentication
const PROTECTED_PATTERNS = [
  /^\/dashboard(\/.*)?$/,
  /^\/orders(\/.*)?$/,
  /^\/menu(\/.*)?$/,
  /^\/settings(\/.*)?$/,
  /^\/superadmin(\/.*)?$/,
]

// Routes only accessible by superadmin
const SUPERADMIN_PATTERNS = [/^\/superadmin(\/.*)?$/]

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
  const url = new URL("/api/tenancy/resolve", request.url)
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

  // ── Superadmin auth guard ────────────────────────────────────
  if (SUPERADMIN_PATTERNS.some((p) => p.test(pathname))) {
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET })
    if (!token) return NextResponse.redirect(new URL("/login", request.url))
    if (!(token as any).isSuperadmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  // ── General auth guard ───────────────────────────────────────
  if (PROTECTED_PATTERNS.some((p) => p.test(pathname))) {
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET })
    if (!token) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

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
