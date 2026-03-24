"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveHappyHourConfigAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return { error: "No autorizado." };
    const restaurantId = session.user.restaurantId as string;

    const happyHourActive = formData.get("happyHourActive") === "true";
    const happyHourStartTime = formData.get("happyHourStartTime") as string || null;
    const happyHourEndTime = formData.get("happyHourEndTime") as string || null;
    const happyHourDays = (formData.getAll("happyHourDays") as string[]).map(d => parseInt(d)).filter(n => !isNaN(n));
    
    // Lista de productos con su configuración individual
    const productsJson = formData.get("productsData") as string;
    const products = productsJson ? JSON.parse(productsJson) : [];

    // 1. Guardar settings en Restaurante
    await (prisma as any).restaurant.update({
      where: { id: restaurantId },
      data: {
        happyHourActive,
        happyHourStartTime,
        happyHourEndTime,
        happyHourDays
      }
    });

    // 2. Actualizar Productos
    // Primero desactivamos todos
    await prisma.product.updateMany({
      where: { restaurantId },
      data: { happyHourEnabled: false }
    });

    // Luego activamos solo los seleccionados y guardamos su descuento individual
    for (const p of products) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          happyHourEnabled: true,
          happyHourDiscountType: p.type || "PERCENTAGE",
          happyHourDiscount: parseFloat(p.discount?.toString() || "0")
        }
      });
    }

    revalidatePath("/dashboard/marketing/happy-hour");
    revalidatePath("/dashboard/menu"); 
    return { success: true };
  } catch (error: any) {
    console.error("saveHappyHourConfigAction error:", error);
    return { error: "Error de servidor: " + error.message };
  }
}
