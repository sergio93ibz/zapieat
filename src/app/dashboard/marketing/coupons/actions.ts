"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createCouponAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return { error: "No autorizado." };
    const restaurantId = session.user.restaurantId as string;

    const code = (formData.get("code") as string).trim().toUpperCase();
    const discountType = formData.get("discountType") as any;
    const discountValue = parseFloat(formData.get("discountValue") as string);
    const minOrderAmountStr = formData.get("minOrderAmount") as string;
    const maxUsesStr = formData.get("maxUses") as string;
    const expiresAtStr = formData.get("expiresAt") as string;
    const freeProductId = formData.get("freeProductId") as string;

    if (!code || isNaN(discountValue)) {
      return { error: "El código y el valor del descuento son obligatorios." };
    }

    const minOrderAmount = minOrderAmountStr ? parseFloat(minOrderAmountStr) : null;
    const maxUses = maxUsesStr ? parseInt(maxUsesStr) : null;
    const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

    // Check if code exists
    const existing = await (prisma as any).coupon.findFirst({
      where: { code, restaurantId }
    });
    if (existing) {
      return { error: "Ya existe un cupón con este código." };
    }

    await (prisma as any).coupon.create({
      data: {
        restaurantId,
        code,
        discountType,
        discountValue,
        minOrderAmount,
        maxUses,
        expiresAt,
        freeProductId: freeProductId || null,
        active: true,
      } as any
    });

    revalidatePath("/dashboard/marketing/coupons");
    return { success: true };
  } catch (error: any) {
    console.error("createCouponAction error:", error);
    return { error: "Error de servidor: " + error.message };
  }
}

export async function deleteCouponAction(couponId: string) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return { error: "No autorizado." };
    const restaurantId = session.user.restaurantId as string;

    await (prisma as any).coupon.delete({
      where: { id: couponId, restaurantId }
    });

    revalidatePath("/dashboard/marketing/coupons");
    return { success: true };
  } catch (error) {
    return { error: "No se pudo eliminar el cupón." };
  }
}

export async function toggleCouponActiveAction(couponId: string, active: boolean) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return { error: "No autorizado." };
    const restaurantId = session.user.restaurantId as string;

    await (prisma as any).coupon.update({
      where: { id: couponId, restaurantId },
      data: { active }
    });

    revalidatePath("/dashboard/marketing/coupons");
    return { success: true };
  } catch (error) {
    return { error: "No se pudo cambiar el estado." };
  }
}
