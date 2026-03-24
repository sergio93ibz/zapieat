import { NextRequest, NextResponse } from "next/server"
import { listProducts } from "@/modules/menu/service"
import { prisma } from "@/lib/prisma"

// GET /api/menu/products?categoryId=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get("slug")
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 })
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 })
  }

  const categoryId = searchParams.get("categoryId") ?? undefined

  const products = await listProducts(restaurant.id, { categoryId })
  return NextResponse.json({ products })
}
