import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireSuperadmin } from "@/lib/permissions"
import {
  createRestaurant,
  listRestaurants,
  suspendRestaurant,
  activateRestaurant,
  countRestaurants,
} from "@/modules/restaurants/service"
import { RestaurantStatus } from "@prisma/client"

// GET /api/superadmin/restaurants
export async function GET(request: NextRequest) {
  const session = await auth()
  requireSuperadmin(session)

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") as RestaurantStatus | null
  const skip = parseInt(searchParams.get("skip") ?? "0")
  const take = parseInt(searchParams.get("take") ?? "20")

  const [restaurants, total] = await Promise.all([
    listRestaurants({ status: status ?? undefined, skip, take }),
    countRestaurants(status ?? undefined),
  ])

  return NextResponse.json({ restaurants, total })
}

// POST /api/superadmin/restaurants
export async function POST(request: NextRequest) {
  const session = await auth()
  requireSuperadmin(session)

  const body = await request.json()
  const restaurant = await createRestaurant(body)
  return NextResponse.json({ restaurant }, { status: 201 })
}
