import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { createStorefrontOrder, markOrderPaid } from "@/modules/orders/service"
import { createCashPayment } from "@/modules/payments/service"
import { sendNewOrderEmail } from "@/modules/notifications/email"
import { rateLimit } from "@/lib/rateLimit"
import { getCustomerSession } from "@/lib/customerAuth"

const createOrderSchema = z.object({
  customerName: z.string().min(1).max(120).optional(),
  customerEmail: z.string().email().max(254).optional(),
  customerPhone: z.string().min(3).max(40).optional(),
  deliveryAddress: z.string().min(1).max(300).optional(),
  deliveryNotes: z.string().max(500).optional(),
  isDelivery: z.boolean().optional().default(true),
  notes: z.string().max(800).optional(),
  paymentMethod: z.enum(["CASH"]).optional().default("CASH"),
  orderType: z.enum(["DELIVERY", "PICKUP", "TABLE"]).optional(),
  tableId: z.string().optional(),
  couponCode: z.string().optional(),
  loyaltyPointsUsed: z.number().int().min(0).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
        notes: z.string().max(300).optional(),
        modifiers: z
          .array(
            z.object({
              modifierId: z.string().min(1),
            })
          )
          .optional()
          .default([]),
      })
    )
    .min(1),
})

// POST /api/storefront/[slug]/orders — public order creation (cash-only MVP)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rl = await rateLimit({
    key: `storefront:order:${slug}:${ip}`,
    limit: 20,
    windowSeconds: 10 * 60,
  })

  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.resetSeconds),
        },
      }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, status: true },
  })

  if (!restaurant || restaurant.status !== "ACTIVE") {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 })
  }

  try {
    const data = parsed.data
    const session = await getCustomerSession()
    
    // Only associate if the session belongs to THIS restaurant
    const customerId = (session && session.restaurantId === restaurant.id) ? session.customerId : undefined

    let deliveryAddress = data.isDelivery ? data.deliveryAddress : "Recogida en local"
    
    // For Table orders, we want the address to reflect the table name
    if (data.orderType === "TABLE" && data.tableId) {
      const table = await (prisma as any).restaurantTable.findUnique({
        where: { id: data.tableId },
        select: { name: true }
      })
      if (table) {
        deliveryAddress = table.name.toLowerCase().includes('mesa') ? table.name : `Mesa ${table.name}`
      }
    }

    const order = await createStorefrontOrder({
      restaurantId: restaurant.id,
      customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      deliveryAddress,
      deliveryNotes: data.deliveryNotes,
      isDelivery: data.isDelivery,
      orderType: data.orderType as any,
      tableId: data.tableId,
      notes: data.notes,
      items: data.items,
      couponCode: (data as any).couponCode, 
      loyaltyPointsUsed: data.loyaltyPointsUsed,
    })

    // Cash-only MVP: immediately mark as paid for a clean workflow.
    await createCashPayment(restaurant.id, order.id, order.total)
    await markOrderPaid(order.id)

    // Best-effort notification (disabled if RESEND_* env missing)
    await sendNewOrderEmail({ restaurantId: restaurant.id, orderId: order.id }).catch((err) =>
      console.warn("[new order email] failed", err)
    )

    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/storefront/[slug]/orders]", err)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
