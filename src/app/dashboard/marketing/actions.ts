"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateLoyaltySettingsAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return { error: "No autorizado." };
    const restaurantId = session.user.restaurantId as string;

    const enableLoyalty = formData.get("enableLoyalty") === "on";
    const perEuroStr = formData.get("loyaltyPointsPerEuro") as string;
    const valueStr = formData.get("loyaltyPointsValue") as string;
    const minRedeemStr = formData.get("loyaltyMinPointsToRedeem") as string;

    const loyaltyPointsPerEuro = parseInt(perEuroStr || "1");
    const loyaltyPointsValue = parseFloat(valueStr || "0.05");
    const loyaltyMinPointsToRedeem = parseInt(minRedeemStr || "100");

    if (isNaN(loyaltyPointsPerEuro) || isNaN(loyaltyPointsValue) || isNaN(loyaltyMinPointsToRedeem)) {
      return { error: "Valores numéricos inválidos." };
    }

    await (prisma as any).restaurant.update({
      where: { id: restaurantId },
      data: {
        enableLoyalty,
        loyaltyPointsPerEuro,
        loyaltyPointsValue,
        loyaltyMinPointsToRedeem,
      }
    });

    revalidatePath("/dashboard/marketing");
    return { success: true };
  } catch (error: any) {
    console.error("updateLoyaltySettingsAction error:", error);
    return { error: "Error de servidor: " + error.message };
  }
}
