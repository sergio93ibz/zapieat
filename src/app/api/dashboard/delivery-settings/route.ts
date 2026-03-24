import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// GET /api/dashboard/delivery-settings
export async function GET() {
  const session = await auth()
  if (!session?.user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const restaurantId = session.user.restaurantId as string

  const settings = await prisma.restaurantDeliverySettings.findUnique({
    where: { restaurantId },
  })

  const hours = await prisma.openingHour.findMany({
    where: { restaurantId },
    orderBy: { dayOfWeek: "asc" },
  })

  const holidays = await prisma.restaurantHoliday.findMany({
    where: { restaurantId, date: { gte: new Date() } },
    orderBy: { date: "asc" },
  })

  return NextResponse.json({ settings, openingHours: hours, holidays })
}

// PUT /api/dashboard/delivery-settings
export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const restaurantId = session.user.restaurantId as string

  const body = await request.json().catch(() => ({}))

  const {
    timezone = "Europe/Madrid",
    deliveryEnabled = true,
    pickupEnabled = true,
    deliveryPostalCodes = [],
    deliveryFee = 0,
    minOrderAmount = 0,
    allowUnderMinOrder = false,
    underMinFee = 0,
    estimatedMinMinutes = 30,
    estimatedMaxMinutes = 60,
    acceptFutureOrders = false,
    maxDaysInAdvance = 0,
    isManuallyOpen = true,
    openingHours = [],
    holidaysToAdd = [],
    holidaysToRemove = [],
  } = body

  // Basic validation/coercion
  const asNumber = (v: any, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }

  const deliveryFeeN = asNumber(deliveryFee, 0)
  const minOrderAmountN = asNumber(minOrderAmount, 0)
  const underMinFeeN = asNumber(underMinFee, 0)

  const rdsModel = (prisma as any)?._runtimeDataModel?.models?.RestaurantDeliverySettings
  const rdsFields: any[] = Array.isArray(rdsModel?.fields) ? rdsModel.fields : []
  const supportsUnderMinFee = rdsFields.some((f) => f?.name === "underMinFee")

  // Upsert delivery settings
  try {
    await prisma.restaurantDeliverySettings.upsert({
      where: { restaurantId },
      create: {
        restaurantId,
        timezone,
        deliveryEnabled,
        pickupEnabled,
        deliveryPostalCodes,
        deliveryFee: new Prisma.Decimal(deliveryFeeN.toFixed(2)),
        minOrderAmount: new Prisma.Decimal(minOrderAmountN.toFixed(2)),
        allowUnderMinOrder,
        ...(supportsUnderMinFee ? { underMinFee: new Prisma.Decimal(underMinFeeN.toFixed(2)) } : {}),
        estimatedMinMinutes: asNumber(estimatedMinMinutes, 30),
        estimatedMaxMinutes: asNumber(estimatedMaxMinutes, 60),
        acceptFutureOrders,
        maxDaysInAdvance: asNumber(maxDaysInAdvance, 0),
        isManuallyOpen,
      },
      update: {
        timezone,
        deliveryEnabled,
        pickupEnabled,
        deliveryPostalCodes,
        deliveryFee: new Prisma.Decimal(deliveryFeeN.toFixed(2)),
        minOrderAmount: new Prisma.Decimal(minOrderAmountN.toFixed(2)),
        allowUnderMinOrder,
        ...(supportsUnderMinFee ? { underMinFee: new Prisma.Decimal(underMinFeeN.toFixed(2)) } : {}),
        estimatedMinMinutes: asNumber(estimatedMinMinutes, 30),
        estimatedMaxMinutes: asNumber(estimatedMaxMinutes, 60),
        acceptFutureOrders,
        maxDaysInAdvance: asNumber(maxDaysInAdvance, 0),
        isManuallyOpen,
      },
    })

  // Upsert opening hours
  for (const hour of openingHours) {
    const deliveryOpenTime = hour.deliveryEnabled ? (hour.deliveryOpenTime || null) : null
    const deliveryCloseTime = hour.deliveryEnabled ? (hour.deliveryCloseTime || null) : null

    await prisma.openingHour.upsert({
      where: { restaurantId_dayOfWeek: { restaurantId, dayOfWeek: hour.dayOfWeek } },
      create: {
        restaurantId,
        dayOfWeek: hour.dayOfWeek,
        openTime: hour.openTime ?? "09:00",
        closeTime: hour.closeTime ?? "22:00",
        isClosed: hour.isClosed ?? false,
        deliveryOpenTime,
        deliveryCloseTime,
        deliveryEnabled: hour.deliveryEnabled ?? true,
      },
      update: {
        openTime: hour.openTime ?? "09:00",
        closeTime: hour.closeTime ?? "22:00",
        isClosed: hour.isClosed ?? false,
        deliveryOpenTime,
        deliveryCloseTime,
        deliveryEnabled: hour.deliveryEnabled ?? true,
      },
    })
  }

  // Add new holidays (supports objects: { date, reason })
  for (const h of holidaysToAdd as any[]) {
    const dateStr = typeof h === "string" ? h : String(h?.date ?? "")
    if (!dateStr) continue
    const reason = typeof h === "object" && h ? (String(h.reason ?? "").trim() || null) : null

    const date = new Date(dateStr)
    date.setUTCHours(0, 0, 0, 0)

    await prisma.restaurantHoliday.upsert({
      where: { restaurantId_date: { restaurantId, date } },
      create: { restaurantId, date, reason },
      update: { reason },
    })
  }

  // Remove holidays
  for (const dateStr of holidaysToRemove as any[]) {
    const date = new Date(dateStr)
    date.setUTCHours(0, 0, 0, 0)
    await prisma.restaurantHoliday.deleteMany({ where: { restaurantId, date } })
  }

  return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error saving delivery settings:", error)
    const msg = String(error?.message ?? "")
    if (msg.includes("Unknown argument `underMinFee`")) {
      return NextResponse.json(
        {
          error: "Failed to save settings",
          details:
            "Tu Prisma Client no coincide con el schema. Reinicia el servidor y ejecuta `npm install` (o al menos `npx prisma generate`) y `npm run db:push`.",
        },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: "Failed to save settings", details: error?.message }, { status: 500 })
  }
}
