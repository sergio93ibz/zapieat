"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function toggleRestaurantPauseAction(paused: boolean, minutes?: number) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return { error: "No autorizado." }
    }
    const restaurantId = session.user.restaurantId as string

    let pausedUntil: Date | null = null;
    if (paused && minutes) {
      pausedUntil = new Date(Date.now() + minutes * 60000);
    }

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        isPaused: paused,
        pausedUntil
      }
    })

    // Revalidate paths so the storefront updates immediately for new customers, 
    // and dashboard reflects the state
    revalidatePath("/", "layout")
    
    return { success: true }
  } catch(error) {
    console.error("Error pausing restaurant:", error)
    return { error: "Fallo al actualizar el estado del restaurante."}
  }
}

export async function getRestaurantPauseStatusAction() {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    
    const res = await prisma.restaurant.findUnique({
      where: { id: session.user.restaurantId as string },
      select: { isPaused: true, pausedUntil: true }
    });

    if (!res) return { error: "Not found" };

    return { 
      success: true, 
      isPaused: res.isPaused, 
      pausedUntil: res.pausedUntil ? res.pausedUntil.toISOString() : null 
    };

  } catch(error) {
    return { error: "Fallo." };
  }
}
