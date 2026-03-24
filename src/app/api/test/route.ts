import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const r = await prisma.restaurantDeliverySettings.findFirst()
  return NextResponse.json(r)
}
