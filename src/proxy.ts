/**
 * proxy.ts — ZapiEat Multi-Tenant Resolver (Next.js 16)
 *
 * 1. Reads host header from incoming request
 * 2. Checks Redis for cached tenant info
 * 3. On miss → queries PostgreSQL via tenancy service
 * 4. Injects x-tenant-id, x-tenant-slug, x-tenant-status headers
 * 5. Guards protected routes (/dashboard, /superadmin) with JWT session
 */

import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getTenantByDomain } from "@/modules/tenancy/service"

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

// Routes that should be excluded from tenant resolution
// (they serve all tenants or are platform-level)
const BYPASS_PATHS = [
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/api\/auth\//,
]

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "zapieat.com"
const ADMIN_SUBDOMAIN = `admin.${BASE_DOMAIN}`

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get("host") ?? ""

  // ── Skip static assets and NextAuth routes ──────────────────
  if (BYPASS_PATHS.some((p) => p.test(pathname))) {
    return NextResponse.next()
  }

  // ── Platform admin requests (admin.<base-domain>) ────────────
  const isAdminHost = host === ADMIN_SUBDOMAIN || host.startsWith("localhost")

  // ── Superadmin auth guard ────────────────────────────────────
  if (SUPERADMIN_PATTERNS.some((p) => p.test(pathname))) {
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET })
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    if (!token.isSuperadmin) {
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

  // ── Tenant-scoped routes (storefront + restaurant admin) ─────
  // Skip tenant resolution for platform admin interface
  if (isAdminHost && pathname.startsWith("/superadmin")) {
    return NextResponse.next()
  }

  // Resolve tenant from the request host
  const tenant = await getTenantByDomain(host)

  if (!tenant) {
    // Domain not found — if it looks like a custom domain, show 404
    if (!isAdminHost) {
      return new NextResponse("Restaurant not found", { status: 404 })
    }
    return NextResponse.next()
  }

  // Check if restaurant is suspended
  if (tenant.status === "SUSPENDED") {
    return new NextResponse("This restaurant is temporarily unavailable", {
      status: 503,
    })
  }

  // ── Inject tenant headers for downstream use ─────────────────
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-tenant-id", tenant.id)
  requestHeaders.set("x-tenant-slug", tenant.slug)
  requestHeaders.set("x-tenant-status", tenant.status)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
