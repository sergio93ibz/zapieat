import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listOrders } from "@/modules/orders/service"
import { OrderStatus } from "@prisma/client"

// GET /api/orders — list orders for the tenant
export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const restaurantIdParam = searchParams.get("restaurantId")
  const tenantId = session.user.isSuperadmin
    ? restaurantIdParam
    : (session.user.restaurantId as string | null)

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant not resolved" }, { status: 400 })
  }

  const status = searchParams.get("status") as OrderStatus | null
  const skip = parseInt(searchParams.get("skip") ?? "0")
  const take = parseInt(searchParams.get("take") ?? "20")

  const orders = await listOrders(tenantId, { status: status ?? undefined, skip, take })
  return NextResponse.json({ orders })
}

// POST /api/orders — create a new order
export async function POST(request: NextRequest) {
  // Public order creation must go through /api/storefront/[slug]/orders.
  // This endpoint is reserved for authenticated back-office flows.
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json(
    { error: "Not implemented. Use /api/storefront/[slug]/orders" },
    { status: 405 }
  )
}
