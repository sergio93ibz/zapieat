import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { notIn: ["CANCELLED", "PENDING_PAYMENT"] } },
      include: { restaurant: true }
    });
    
    return NextResponse.json({ count: orders.length, orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
