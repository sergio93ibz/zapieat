import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/orders/[id] — order detail for authenticated restaurant users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const restaurantId = session.user.restaurantId as string

  try {
    const order = await prisma.order.findFirst({
      where: { id, restaurantId },
      include: {
        items: { include: { modifiers: true } },
        payment: true,
        adjustments: { orderBy: { createdAt: "desc" } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const adjustments = order.adjustments ?? []
    const pendingAdjustments = adjustments.filter((a) => a.status === "PENDING")
    const pendingAmount = pendingAdjustments.reduce(
      (acc, a) => acc + Number(a.amount),
      0
    )

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        isDelivery: order.isDelivery,
        deliveryAddress: order.deliveryAddress,
        deliveryNotes: order.deliveryNotes,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        notes: order.notes,
        subtotal: order.subtotal ?? "0",
        deliveryFee: order.deliveryFee ?? "0",
        tax: order.tax ?? "0",
        total: order.total ?? "0",
        items: order.items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          productNameSnapshot: i.productNameSnapshot,
          unitPrice: i.unitPrice,
          notes: i.notes,
          modifiers: i.modifiers.map((m) => ({
            id: m.id,
            modifierNameSnapshot: m.modifierNameSnapshot,
            price: m.price,
          })),
        })),
        payment: order.payment
          ? {
              provider: order.payment.provider,
              status: order.payment.status,
              amount: order.payment.amount,
            }
          : null,
        adjustments: adjustments.map((a) => ({
          id: a.id,
          amount: a.amount,
          reason: a.reason,
          status: a.status,
          createdAt: a.createdAt,
        })),
        pendingAdjustmentAmount: pendingAmount,
      },
    })
  } catch (err: any) {
    console.error("[GET /api/orders/[id]]", err)
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message ?? String(err) },
      { status: 500 }
    )
  }
}
