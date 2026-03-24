import { NextResponse } from "next/server"
import { getTenantByDomain } from "@/modules/tenancy/service"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const domain = url.searchParams.get("domain")

  if (!domain) {
    return NextResponse.json({ error: "Missing 'domain'" }, { status: 400 })
  }

  try {
    const tenant = await getTenantByDomain(domain)
    if (!tenant) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(tenant, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[Tenancy] Resolve failed:", err)
    return NextResponse.json({ error: "Resolve failed" }, { status: 500 })
  }
}
