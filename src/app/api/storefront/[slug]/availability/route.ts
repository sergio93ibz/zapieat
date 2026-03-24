import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// ──────────────────────────────────────────────────────────────────────────────
// Convert "HH:MM" to minutes since midnight.
// "00:00" as a CLOSE time means midnight = end of day = 1440 min.
// "00:00" as an OPEN time stays 0.
// ──────────────────────────────────────────────────────────────────────────────
function toMinutes(t: string, isClose = false): number {
  if (!t || !t.includes(":")) return isClose ? 1440 : 0
  const [h, m] = t.split(":").map(Number)
  const mins = (h || 0) * 60 + (m || 0)
  // "00:00" as close time = midnight = end of day
  if (mins === 0 && isClose) return 1440
  return mins
}

function isTimeInRange(current: string, open: string, close: string): boolean {
  const cur = toMinutes(current)
  const o = toMinutes(open, false)
  const c = toMinutes(close, true)

  if (o < c) {
    // Normal range: 09:00 – 23:30, or 09:00 – 00:00 (1440)
    return cur >= o && cur < c
  } else if (o > c) {
    // Overnight range: 22:00 – 02:00 (crosses midnight)
    return cur >= o || cur < c
  }
  return false
}

// ──────────────────────────────────────────────────────────────────────────────
// Get current date/time in a specific IANA timezone (no external deps)
// ──────────────────────────────────────────────────────────────────────────────
function getNowInTimezone(timezone: string): {
  dayOfWeek: number
  timeStr: string
  dateStr: string
  currentMinutes: number
} {
  const now = new Date()
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    })
    const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]))
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    }
    const dayOfWeek = weekdayMap[parts.weekday] ?? now.getDay()
    // Intl may return "24" for midnight in some envs, normalize to "00"
    const hour = parts.hour === "24" ? "00" : parts.hour
    const timeStr = `${hour}:${parts.minute}`
    const dateStr = `${parts.year}-${parts.month}-${parts.day}`
    const currentMinutes = toMinutes(timeStr)
    return { dayOfWeek, timeStr, dateStr, currentMinutes }
  } catch {
    // Fallback to server local time
    const h = String(now.getHours()).padStart(2, "0")
    const m = String(now.getMinutes()).padStart(2, "0")
    const y = now.getFullYear()
    const mo = String(now.getMonth() + 1).padStart(2, "0")
    const d = String(now.getDate()).padStart(2, "0")
    const timeStr = `${h}:${m}`
    return {
      dayOfWeek: now.getDay(),
      timeStr,
      dateStr: `${y}-${mo}-${d}`,
      currentMinutes: toMinutes(timeStr),
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/storefront/[slug]/availability
// ──────────────────────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const postalCode = searchParams.get("postalCode")?.trim() ?? ""

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      deliverySettings: true,
      openingHours: { orderBy: { dayOfWeek: "asc" } },
      holidays: true,
    } as any,
  })

  if (!restaurant || restaurant.status !== "ACTIVE") {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 })
  }

  const settings = (restaurant as any).deliverySettings
  const openingHours: any[] = (restaurant as any).openingHours ?? []
  const holidays: any[] = (restaurant as any).holidays ?? []

  // ── Current time in restaurant timezone ──
  const timezone = settings?.timezone ?? "Europe/Madrid"
  const { dayOfWeek, timeStr, dateStr, currentMinutes } = getNowInTimezone(timezone)

  // ── Holiday check ──
  const isHoliday = holidays.some((h: any) => {
    const hDate = new Date(h.date).toISOString().slice(0, 10)
    return hDate === dateStr
  })

  // ── Today's opening hours ──
  const todayHours = openingHours.find((h: any) => h.dayOfWeek === dayOfWeek)

  // ── Is restaurant open? ──
  // If no hours are configured yet AND isManuallyOpen=true → treat as open
  const manuallyOpen = settings?.isManuallyOpen ?? true
  let isOpenNow = false

  if (!manuallyOpen) {
    isOpenNow = false
  } else if (isHoliday) {
    isOpenNow = false
  } else if (!todayHours) {
    // No hours configured → open if manually set to open
    isOpenNow = manuallyOpen
  } else if (todayHours.isClosed) {
    isOpenNow = false
  } else {
    // Use minute-based comparison to handle "00:00" midnight correctly
    isOpenNow = isTimeInRange(timeStr, todayHours.openTime, todayHours.closeTime)
  }

  let deliveryAvailable = false
  let deliveryFee = 0
  let minOrder = 0
  let allowUnderMinOrder = false
  let underMinFee = 0

  if (settings?.deliveryEnabled) {
    const codes: string[] = settings.deliveryPostalCodes ?? []
    if (postalCode !== "") {
      deliveryAvailable = codes.length === 0 || codes.includes(postalCode)
    } else {
      // No CP given → available only if no postal code restrictions
      deliveryAvailable = codes.length === 0
    }
    deliveryFee = Number(settings.deliveryFee)
    minOrder = Number(settings.minOrderAmount)
    allowUnderMinOrder = settings.allowUnderMinOrder ?? false
    underMinFee = Number(settings.underMinFee ?? 0)
  }

  let isDeliveryOpenNow = false
  if (deliveryAvailable && isOpenNow && todayHours) {
    const deliveryOpen: string = todayHours.deliveryOpenTime ?? todayHours.openTime
    const deliveryClose: string = todayHours.deliveryCloseTime ?? todayHours.closeTime
    isDeliveryOpenNow =
      (todayHours.deliveryEnabled ?? true) &&
      isTimeInRange(timeStr, deliveryOpen, deliveryClose)
  } else if (deliveryAvailable && isOpenNow && !todayHours) {
    // No specific hours → delivery open if restaurant open
    isDeliveryOpenNow = true
  }

  return NextResponse.json({
    slug,
    timezone,
    _debug: {
      serverUTC: new Date().toISOString(),
      restaurantDateTime: `${dateStr} ${timeStr}`,
      currentMinutes,
      dayOfWeek,
      hoursConfigured: openingHours.length,
      todayHoursFound: !!todayHours,
      openTime: todayHours?.openTime ?? null,
      closeTime: todayHours?.closeTime ?? null,
      openMinutes: todayHours ? toMinutes(todayHours.openTime, false) : null,
      closeMinutes: todayHours ? toMinutes(todayHours.closeTime, true) : null,
      isClosed: todayHours?.isClosed ?? null,
      isHoliday,
      manuallyOpen,
      isOpenNow,
      note: todayHours?.closeTime === "00:00"
        ? "closeTime 00:00 = medianoche = 1440 min (fin de día)"
        : undefined,
    },
    isOpenNow,
    isHoliday,
    todayHours: todayHours
      ? {
          dayOfWeek: todayHours.dayOfWeek,
          openTime: todayHours.openTime,
          closeTime: todayHours.closeTime,
          isClosed: todayHours.isClosed,
          deliveryOpenTime: todayHours.deliveryOpenTime ?? todayHours.openTime,
          deliveryCloseTime: todayHours.deliveryCloseTime ?? todayHours.closeTime,
        }
      : null,
    delivery: {
      enabled: settings?.deliveryEnabled ?? false,
      available: deliveryAvailable,
      openNow: isDeliveryOpenNow,
      fee: deliveryFee,
      minOrder,
      allowUnderMinOrder,
      underMinFee,
      estimatedMin: settings?.estimatedMinMinutes ?? 30,
      estimatedMax: settings?.estimatedMaxMinutes ?? 60,
    },
    pickup: {
      enabled: settings?.pickupEnabled ?? true,
      available: isOpenNow,
    },
    acceptFutureOrders: settings?.acceptFutureOrders ?? false,
    maxDaysInAdvance: settings?.maxDaysInAdvance ?? 0,
  })
}
