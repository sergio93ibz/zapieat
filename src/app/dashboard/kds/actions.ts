"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@prisma/client";

export async function getPendingKDSOrdersAction() {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) {
      return { error: "No autorizado." };
    }
    const restaurantId = session.user.restaurantId as string;

    // Solo queremos pedidos que la cocina tenga que preparar
    // Asumimos que PENDING_PAYMENT (pago en efectivo al repartidor), PAID, y PREPARING deben mostrarse.
    const statuses: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "PREPARING"];

    const pendingOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: statuses }
      },
      include: {
        items: {
          include: {
            modifiers: true
          }
        }
      },
      orderBy: { createdAt: "asc" } // El más antiguo primero
    });

    // Handle Decimal serialization for the Client Component
    const serializedOrders = pendingOrders.map(order => ({
      ...order,
      total: order.total.toString(),
      subtotal: order.subtotal.toString(),
      deliveryFee: order.deliveryFee.toString(),
      tax: order.tax.toString(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
        modifiers: item.modifiers.map(mod => ({
          ...mod,
          price: mod.price.toString()
        }))
      }))
    }));

    return { success: true, orders: serializedOrders };
  } catch (error) {
    console.error("Error fetching KDS orders", error);
    return { error: "Hubo un error al recuperar los pedidos." };
  }
}

export async function markOrderReadyAction(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) {
      return { error: "No autorizado." };
    }
    const restaurantId = session.user.restaurantId as string;

    await prisma.order.update({
      where: { id: orderId, restaurantId },
      data: { status: "READY" }
    });

    // Revalidate other dashboards
    revalidatePath("/dashboard/orders");
    
    return { success: true };
  } catch (error) {
    console.error("Error setting order ready", error);
    return { error: "Hubo un error al actualizar el pedido." };
  }
}
