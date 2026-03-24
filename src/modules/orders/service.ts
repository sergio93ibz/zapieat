/**
 * modules/orders/service.ts
 * Order lifecycle management — all queries scoped by restaurantId.
 */

import { prisma } from "@/lib/prisma"
import { Order, OrderStatus, Prisma } from "@prisma/client"

interface OrderItemInput {
  productId: string
  quantity: number
  productNameSnapshot: string
  unitPrice: number | Prisma.Decimal
  notes?: string
  modifiers?: Array<{
    modifierId: string
    modifierNameSnapshot: string
    price: number | Prisma.Decimal
  }>
}

interface CreateOrderInput {
  restaurantId: string
  customerId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  deliveryAddress?: string
  deliveryNotes?: string
  isDelivery?: boolean
  subtotal: number | Prisma.Decimal
  deliveryFee?: number | Prisma.Decimal
  tax?: number | Prisma.Decimal
  total: number | Prisma.Decimal
  notes?: string
  items: OrderItemInput[]
}

export interface StorefrontOrderItemInput {
  productId: string
  quantity: number
  notes?: string
  modifiers?: Array<{ modifierId: string }>
}

export interface CreateStorefrontOrderInput {
  restaurantId: string
  customerId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  deliveryAddress?: string
  deliveryNotes?: string
  isDelivery?: boolean
  orderType?: "DELIVERY" | "PICKUP" | "TABLE" | any
  tableId?: string
  couponCode?: string
  notes?: string
  items: StorefrontOrderItemInput[]
  loyaltyPointsUsed?: number
}

function decimalToCents(value: unknown): number {
  if (value === null || value === undefined) return 0

  const s =
    typeof value === "string"
      ? value
      : typeof value === "number"
        ? String(value)
        : typeof (value as any)?.toString === "function"
          ? (value as any).toString()
          : "0"

  const trimmed = s.trim()
  if (!/^[-+]?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid decimal value: ${s}`)
  }

  const isNeg = trimmed.startsWith("-")
  const unsigned = trimmed.replace(/^[-+]/, "")
  const [intPart, fracPartRaw] = unsigned.split(".")
  const fracPart = (fracPartRaw ?? "").padEnd(2, "0").slice(0, 2)

  const cents = parseInt(intPart, 10) * 100 + parseInt(fracPart, 10)
  return isNeg ? -cents : cents
}

function centsToDecimal(cents: number): Prisma.Decimal {
  const sign = cents < 0 ? "-" : ""
  const abs = Math.abs(cents)
  const intPart = Math.floor(abs / 100)
  const fracPart = String(abs % 100).padStart(2, "0")
  return new Prisma.Decimal(`${sign}${intPart}.${fracPart}`)
}

function isUniqueOrderNumberError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray((err.meta as any)?.target) &&
    ((err.meta as any).target as string[]).includes("restaurantId") &&
    ((err.meta as any).target as string[]).includes("orderNumber")
  )
}

/**
 * Public storefront order creation.
 * Server-side validates item ownership and recalculates all totals from DB.
 */
export async function createStorefrontOrder(
  input: CreateStorefrontOrderInput
): Promise<Order> {
  if (!input.items?.length) {
    throw new Error("Order must contain at least one item")
  }

  const productIds = Array.from(new Set(input.items.map((i) => i.productId)))

  const products = await prisma.product.findMany({
    where: {
      restaurantId: input.restaurantId,
      id: { in: productIds },
      isAvailable: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      isOffer: true,
      offerPrice: true,
      modifierGroups: {
        select: {
          id: true,
          required: true,
          minSelections: true,
          maxSelections: true,
          modifiers: {
            where: { isAvailable: true },
            select: { id: true, name: true, price: true },
          },
        },
      },
    },
  })

  const productById = new Map(products.map((p) => [p.id, p]))

  // Prepare validated nested write data + compute totals in cents
  let subtotalCents = 0
  const orderItemsData = input.items.map((item) => {
    const product = productById.get(item.productId)
    if (!product) {
      throw new Error("Invalid product")
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new Error("Invalid quantity")
    }

    const basePriceCents = decimalToCents(
      product.isOffer && product.offerPrice !== null ? product.offerPrice : product.price
    )

    const groups = product.modifierGroups ?? []
    const modifierToGroup = new Map<string, string>()
    const modifierById = new Map<string, { id: string; name: string; price: unknown }>()
    for (const g of groups) {
      for (const m of g.modifiers ?? []) {
        modifierToGroup.set(m.id, g.id)
        modifierById.set(m.id, m)
      }
    }

    const selectedModifierIds = Array.from(
      new Set((item.modifiers ?? []).map((m) => m.modifierId))
    )

    // Validate selected modifiers belong to this product (via its groups) and are available
    for (const modId of selectedModifierIds) {
      if (!modifierToGroup.has(modId)) {
        throw new Error("Invalid modifier")
      }
    }

    // Validate group constraints
    const groupSelectionCount = new Map<string, number>()
    for (const modId of selectedModifierIds) {
      const groupId = modifierToGroup.get(modId) as string
      groupSelectionCount.set(groupId, (groupSelectionCount.get(groupId) ?? 0) + 1)
    }

    for (const g of groups) {
      const count = groupSelectionCount.get(g.id) ?? 0
      const min = Math.max(0, g.minSelections ?? 0)
      const max = Math.max(0, g.maxSelections ?? 0)
      const requiredMin = g.required ? Math.max(1, min) : min

      if (count < requiredMin) {
        throw new Error("Missing required modifier selection")
      }
      if (max > 0 && count > max) {
        throw new Error("Too many modifiers selected")
      }
      if (count > 0 && count < min) {
        throw new Error("Not enough modifiers selected")
      }
    }

    // Compute modifiers total
    let modifiersCents = 0
    const modifiersCreate = selectedModifierIds.map((modId) => {
      const m = modifierById.get(modId)
      if (!m) throw new Error("Invalid modifier")
      const priceCents = decimalToCents(m.price)
      modifiersCents += priceCents
      return {
        modifierId: modId,
        modifierNameSnapshot: m.name,
        price: centsToDecimal(priceCents),
      }
    })

    const lineTotalCents = (basePriceCents + modifiersCents) * item.quantity
    subtotalCents += lineTotalCents

    return {
      productId: product.id,
      quantity: item.quantity,
      productNameSnapshot: product.name,
      unitPrice: centsToDecimal(basePriceCents),
      notes: item.notes,
      modifiers: { create: modifiersCreate },
    }
  })

  if (subtotalCents < 0) {
    throw new Error("Invalid totals")
  }

  const deliveryFeeCents = 0
  const taxCents = 0
  
  let discountAppliedCents = 0
  let appliedCouponId: string | undefined = undefined

  // Parse Coupon
  if (input.couponCode) {
    const coupon = await (prisma as any).coupon.findFirst({
      where: { restaurantId: input.restaurantId, code: input.couponCode.trim().toUpperCase() }
    })
    if (coupon && coupon.active && (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date()) && (!coupon.maxUses || coupon.usesCount < coupon.maxUses)) {
      if (!coupon.minOrderAmount || subtotalCents >= decimalToCents(coupon.minOrderAmount)) {
        appliedCouponId = coupon.id
        if (coupon.discountType === "PERCENTAGE") {
          discountAppliedCents = Math.floor(subtotalCents * (parseFloat(coupon.discountValue.toString()) / 100))
        } else if (coupon.discountType === "FIXED_AMOUNT") {
          discountAppliedCents = decimalToCents(coupon.discountValue)
        } else if (coupon.discountType === "FREE_PRODUCT" && coupon.freeProductId) {
          const fp = await prisma.product.findUnique({ where: { id: coupon.freeProductId }, select: { id: true, name: true } })
          if (fp) {
            orderItemsData.push({
              productId: fp.id,
              quantity: 1,
              productNameSnapshot: fp.name + " (CUPÓN REGALO)",
              unitPrice: centsToDecimal(0),
              notes: undefined,
              modifiers: { create: [] }
            })
          }
        }
      }
    }
  }

  let finalDiscountCents = discountAppliedCents
  let loyaltyRedeemedCents = 0

  // Fetch restaurant loyalty settings
  const restaurant = await (prisma as any).restaurant.findUnique({
    where: { id: input.restaurantId },
    select: {
      enableLoyalty: true,
      loyaltyPointsPerEuro: true,
      loyaltyPointsValue: true,
      loyaltyMinPointsToRedeem: true,
    }
  })

  // Allocate orderNumber + create atomically, retrying on unique collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        let currentLoyaltyDiscountCents = 0
        let pointsToRedeem = 0

        if (input.customerId && input.loyaltyPointsUsed && input.loyaltyPointsUsed > 0 && (restaurant as any)?.enableLoyalty) {
          const customer = await (tx as any).customer.findUnique({
            where: { id: input.customerId },
            select: { loyaltyPoints: true }
          })

          if (customer && (customer as any).loyaltyPoints >= ((restaurant as any).loyaltyMinPointsToRedeem || 0) && (customer as any).loyaltyPoints >= input.loyaltyPointsUsed) {
            pointsToRedeem = input.loyaltyPointsUsed
            const pointValue = parseFloat((restaurant as any).loyaltyPointsValue?.toString() || "0")
            currentLoyaltyDiscountCents = Math.floor(pointsToRedeem * pointValue * 100)
            loyaltyRedeemedCents = currentLoyaltyDiscountCents
            finalDiscountCents += currentLoyaltyDiscountCents
          }
        }

        const totalCents = Math.max(0, subtotalCents + deliveryFeeCents + taxCents - finalDiscountCents)

        const lastOrder = await tx.order.findFirst({
          where: { restaurantId: input.restaurantId },
          orderBy: { orderNumber: "desc" },
          select: { orderNumber: true },
        })

        const orderNumber = (lastOrder?.orderNumber ?? 0) + 1

        const newOrder = await (tx as any).order.create({
          data: {
            restaurantId: input.restaurantId,
            orderNumber,
            status: OrderStatus.PENDING_PAYMENT,
            customerId: input.customerId,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone,
            deliveryAddress: input.deliveryAddress,
            deliveryNotes: input.deliveryNotes,
            isDelivery: input.isDelivery ?? true,
            type: input.orderType || (input.isDelivery ? "DELIVERY" : "PICKUP"),
            tableId: input.tableId,
            subtotal: centsToDecimal(subtotalCents),
            deliveryFee: centsToDecimal(deliveryFeeCents),
            tax: centsToDecimal(taxCents),
            total: centsToDecimal(totalCents),
            couponId: appliedCouponId,
            discountApplied: centsToDecimal(finalDiscountCents),
            loyaltyPointsUsed: pointsToRedeem,
            loyaltyPointsEarned: Math.floor((totalCents / 100) * (restaurant?.loyaltyPointsPerEuro || 0)),
            notes: input.notes,
            items: { create: orderItemsData },
          },
          include: { items: { include: { modifiers: true } } },
        })

        if (appliedCouponId) {
          await (tx as any).coupon.update({
             where: { id: appliedCouponId },
             data: { usesCount: { increment: 1 } }
          })
        }

        // Update Loyalty Points
        if (input.customerId && (restaurant as any)?.enableLoyalty) {
          const pointsEarned = Math.floor((totalCents / 100) * ((restaurant as any).loyaltyPointsPerEuro || 0))
          
          await (tx as any).customer.update({
            where: { id: input.customerId },
            data: {
              loyaltyPoints: {
                increment: pointsEarned - pointsToRedeem
              }
            }
          })
          
          // Store points earned/used in order if schema allowed (currently no fields in Order model, skipping for now or update schema)
          // Actually, let's check if we should add loyaltyPointsUsed/Earned to Order model.
          // User asked to see it in account, having it in order history would be good.
        }

        return newOrder
      })
    } catch (err) {
      if (isUniqueOrderNumberError(err) && attempt < 4) continue
      throw err
    }
  }

  throw new Error("Failed to allocate order number")
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  // Backwards-compatible wrapper (legacy endpoint). Prefer createStorefrontOrder.
  return createStorefrontOrder({
    restaurantId: input.restaurantId,
    customerId: input.customerId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    deliveryAddress: input.deliveryAddress,
    deliveryNotes: input.deliveryNotes,
    isDelivery: input.isDelivery,
    notes: input.notes,
    items: input.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      notes: i.notes,
      modifiers: (i.modifiers ?? []).map((m) => ({ modifierId: m.modifierId })),
    })),
  })
}

export async function getOrder(
  restaurantId: string,
  orderId: string
): Promise<Order | null> {
  return prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: {
      items: { include: { modifiers: true, product: true } },
      payment: true,
    },
  })
}

export async function listOrders(
  restaurantId: string,
  options?: {
    status?: OrderStatus
    skip?: number
    take?: number
    from?: Date
    to?: Date
  }
) {
  return prisma.order.findMany({
    where: {
      restaurantId,
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.from || options?.to
        ? {
            createdAt: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    skip: options?.skip ?? 0,
    take: options?.take ?? 50,
    include: { items: true },
  })
}

export async function updateOrderStatus(
  restaurantId: string,
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  // Verify tenant ownership before updating
  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
  })
  if (!order) throw new Error("Order not found or access denied")

  return prisma.order.update({ where: { id: orderId }, data: { status } })
}

export async function markOrderPaid(orderId: string): Promise<Order> {
  return prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.PAID },
  })
}

export async function getOrderStats(
  restaurantId: string,
  from: Date,
  to: Date
) {
  const [total, revenue] = await Promise.all([
    prisma.order.count({
      where: {
        restaurantId,
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
        createdAt: { gte: from, lte: to },
      },
    }),
    prisma.order.aggregate({
      where: {
        restaurantId,
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
        createdAt: { gte: from, lte: to },
      },
      _sum: { total: true },
    }),
  ])

  return {
    totalOrders: total,
    totalRevenue: revenue._sum.total ?? new Prisma.Decimal(0),
  }
}
