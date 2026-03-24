import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { updateOrderStatus } from "@/modules/orders/service"
import { OrderStatus } from "@prisma/client"

// PATCH /api/orders/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.restaurantId as string | null
  if (!tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { status } = await request.json() as { status: OrderStatus }
  if (!Object.values(OrderStatus).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 422 })
  }

  try {
    const order = await updateOrderStatus(tenantId, id, status)
    return NextResponse.json({ order })
  } catch (err) {
    console.error("[PATCH /api/orders/[id]/status]", err)
    return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 })
  }
}
