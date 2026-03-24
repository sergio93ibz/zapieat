"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProductBadgesAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return { error: "No autorizado." };
    const restaurantId = session.user.restaurantId as string;

    const productId = formData.get("productId") as string;
    if (!productId) return { error: "ID de producto requerido." };

    const isRecommended = formData.get("isRecommended") === "on";
    const isBestSeller = formData.get("isBestSeller") === "on";

    await prisma.product.update({
      where: { id: productId, restaurantId },
      data: {
        isRecommended,
        isBestSeller
      } as any
    });

    revalidatePath("/dashboard/marketing/badges");
    revalidatePath("/dashboard/menu"); 
    return { success: true };
  } catch (error: any) {
    console.error("updateProductBadgesAction error:", error);
    return { error: "Error de servidor: " + error.message };
  }
}
