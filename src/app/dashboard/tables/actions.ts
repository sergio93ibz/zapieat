"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

async function getRestaurantId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No session");
  
  // Use restaurantId directly from session if available (it is added in callbacks)
  if (session.user.restaurantId) return session.user.restaurantId;

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
  });
  
  if (!membership) throw new Error("No restaurant found for user");
  return membership.restaurantId;
}

export async function createTableAction(formData: FormData) {
  try {
    const restaurantId = await getRestaurantId();
    const name = formData.get("name") as string;

    if (!name) return { error: "El nombre es obligatorio" };

    await prisma.restaurantTable.create({
      data: {
        restaurantId,
        name,
      },
    });

    revalidatePath("/dashboard/tables");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Error al crear la mesa" };
  }
}

export async function deleteTableAction(id: string) {
  try {
    const restaurantId = await getRestaurantId();
    
    const res = await prisma.restaurantTable.deleteMany({
      where: {
        id,
        restaurantId,
      },
    })

    if (res.count === 0) {
      return { error: "Mesa no encontrada." }
    }

    revalidatePath("/dashboard/tables");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Error al eliminar la mesa" };
  }
}

export async function toggleTableStatusAction(id: string, isActive: boolean) {
  try {
    const restaurantId = await getRestaurantId();
    
    const res = await prisma.restaurantTable.updateMany({
      where: {
        id,
        restaurantId,
      },
      data: { isActive },
    })

    if (res.count === 0) {
      return { error: "Mesa no encontrada." }
    }

    revalidatePath("/dashboard/tables");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Error al actualizar la mesa" };
  }
}
