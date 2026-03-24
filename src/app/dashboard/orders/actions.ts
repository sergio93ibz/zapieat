"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { OrderAdjustmentStatus, OrderStatus, Prisma } from "@prisma/client"

export async function advanceOrderStatusAction(orderId: string, currentStatus: OrderStatus) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return { error: "No autorizado." }
    }
    const restaurantId = session.user.restaurantId as string

    let nextStatus: OrderStatus = currentStatus
    if (currentStatus === "PENDING_PAYMENT" || currentStatus === "PAID") nextStatus = "PREPARING"
    else if (currentStatus === "PREPARING") nextStatus = "READY"
    else if (currentStatus === "READY") nextStatus = "DELIVERING"
    else if (currentStatus === "DELIVERING") nextStatus = "DELIVERED"
    else return { error: "El pedido ya está en su estado final." }

    await prisma.order.updateMany({
      where: { id: orderId, restaurantId },
      data: { status: nextStatus }
    })

    revalidatePath("/dashboard/orders")
    return { success: true }
  } catch (error) {
    return { error: "Error al actualizar." }
  }
}

export async function markAsCancelledAction(orderId: string) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return { error: "No autorizado." }
    }
    const restaurantId = session.user.restaurantId as string

    await prisma.order.updateMany({
      where: { id: orderId, restaurantId },
      data: { status: "CANCELLED" }
    })

    revalidatePath("/dashboard/orders")
    return { success: true }
  } catch(error) {
    return { error: "Error al cancelar." }
  }
}

export async function markAsDeliveredAction(orderId: string) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return { error: "No autorizado." }
    }
    const restaurantId = session.user.restaurantId as string

    await prisma.order.updateMany({
      where: { id: orderId, restaurantId },
      data: { status: "DELIVERED" },
    })

    revalidatePath("/dashboard/orders")
    return { success: true }
  } catch {
    return { error: "Error al finalizar." }
  }
}

export async function addPositiveAdjustmentAction(
  orderId: string,
  amountInput: number,
  reason?: string
) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId || !session.user.id) {
      return { error: "No autorizado." }
    }
    const restaurantId = session.user.restaurantId as string

    const amount = Number(amountInput)
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: "Importe invalido." }
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      select: { id: true },
    })
    if (!order) {
      return { error: "Pedido no encontrado." }
    }

    await prisma.orderAdjustment.create({
      data: {
        restaurantId,
        orderId,
        createdByUserId: session.user.id,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        reason: reason?.trim() || null,
        status: OrderAdjustmentStatus.PENDING,
      },
    })

    revalidatePath("/dashboard/orders")
    return { success: true }
  } catch (err) {
    console.error("addPositiveAdjustmentAction", err)
    return { error: "No se pudo anadir el cargo." }
  }
}

export async function settlePendingAdjustmentsAction(orderId: string) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return { error: "No autorizado." }
    }
    const restaurantId = session.user.restaurantId as string

    await prisma.orderAdjustment.updateMany({
      where: { orderId, restaurantId, status: OrderAdjustmentStatus.PENDING },
      data: { status: OrderAdjustmentStatus.SETTLED },
    })

    revalidatePath("/dashboard/orders")
    return { success: true }
  } catch {
    return { error: "No se pudo marcar como cobrado." }
  }
}

export async function createMockOrderAction() {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return { error: "No autorizado." }
    }
    const restaurantId = session.user.restaurantId as string

    // 1. Conseguir algún producto aleatorio para el mock
    const products = await prisma.product.findMany({
      where: { restaurantId },
      take: 2
    })

    if (products.length === 0) {
       return { error: "Ve primero a 'Gestión de Menú' y crea un producto para poder generar pedidos de prueba." }
    }

    // 2. Comprobar número de pedido
    const lastOrder = await prisma.order.findFirst({
      where: { restaurantId },
      orderBy: { orderNumber: 'desc' }
    })
    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1

    // 3. Crear cabecera y items
    const total = products.reduce((acc, p) => acc + Number(p.price), 0)

    const orderReq = await prisma.order.create({
      data: {
        restaurantId,
        orderNumber,
        status: "PAID",
        customerName: "Juan Pérez (Test)",
        subtotal: total.toFixed(2),
        total: total.toFixed(2),
        isDelivery: Math.random() > 0.5,
        items: {
          create: products.map(p => ({
            productId: p.id,
            quantity: 1,
            productNameSnapshot: p.name,
            unitPrice: p.price
          }))
        }
      }
    })

    revalidatePath("/dashboard/orders")
    return { success: true }

  } catch(error) {
    console.error(error)
    return { error: "Error al crear mock." }
  }
}
