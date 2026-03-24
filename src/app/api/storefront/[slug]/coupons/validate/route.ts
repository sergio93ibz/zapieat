import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { code, cartSubtotal } = body;

    if (!code) {
      return NextResponse.json({ valid: false, message: "Código no proporcionado." }, { status: 400 });
    }

    const restaurant = await (prisma as any).restaurant.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!restaurant) {
      return NextResponse.json({ valid: false, message: "Restaurante no encontrado." }, { status: 404 });
    }

    const coupon = await (prisma as any).coupon.findFirst({
      where: {
        restaurantId: restaurant.id,
        code: code.trim().toUpperCase()
      },
      include: { product: true }
    });

    if (!coupon) {
      return NextResponse.json({ valid: false, message: "Cupón no válido." });
    }

    if (!coupon.active) {
      return NextResponse.json({ valid: false, message: "Este cupón está desactivado." });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, message: "El cupón ha caducado." });
    }

    if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, message: "El cupón ha alcanzado su límite de usos." });
    }

    if (coupon.minOrderAmount && cartSubtotal < parseFloat(coupon.minOrderAmount.toString())) {
      return NextResponse.json({ valid: false, message: `El pedido mínimo para este cupón es de ${parseFloat(coupon.minOrderAmount.toString()).toFixed(2)}€.` });
    }

    // Pass
    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: parseFloat(coupon.discountValue.toString()),
        freeProductId: coupon.freeProductId,
        freeProduct: coupon.product ? {
          id: coupon.product.id,
          name: coupon.product.name,
          price: Number(coupon.product.price)
        } : null
      }
    });

  } catch (error: any) {
    console.error("COUPON API ERROR:", error);
    return NextResponse.json({ valid: false, message: "Error interno verificando cupón: " + error.message }, { status: 500 });
  }
}
