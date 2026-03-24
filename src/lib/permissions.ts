import { Session } from "next-auth"
import { UserRole } from "@prisma/client"

// ─── Role Checks ──────────────────────────────────────────────

export function isSuperadmin(session: Session | null): boolean {
  return session?.user?.role === UserRole.SUPERADMIN
}

export function isRestaurantAdmin(session: Session | null): boolean {
  return (
    session?.user?.role === UserRole.RESTAURANT_ADMIN ||
    session?.user?.role === UserRole.SUPERADMIN
  )
}

export function isStaff(session: Session | null): boolean {
  return (
    session?.user?.role === UserRole.STAFF ||
    isRestaurantAdmin(session)
  )
}

export function canAccessRestaurant(
  session: Session | null,
  restaurantId: string
): boolean {
  if (!session?.user) return false
  if (isSuperadmin(session)) return true
  return session.user.restaurantId === restaurantId
}

// ─── Throw helpers (Server-side) ─────────────────────────────

export function requireAuth(session: Session | null): asserts session is Session {
  if (!session?.user) {
    throw new Error("UNAUTHORIZED")
  }
}

export function requireSuperadmin(session: Session | null): void {
  requireAuth(session)
  if (!isSuperadmin(session)) {
    throw new Error("FORBIDDEN: Superadmin required")
  }
}

export function requireRestaurantAccess(
  session: Session | null,
  restaurantId: string
): void {
  requireAuth(session)
  if (!canAccessRestaurant(session, restaurantId)) {
    throw new Error("FORBIDDEN: No access to this restaurant")
  }
}
