"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireSuperadmin } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { MembershipRole, RestaurantStatus, UserRole } from "@prisma/client"
import { sendOnboardingEmail } from "@/modules/notifications/email"

const createRestaurantWithAdminSchema = z.object({
  restaurantName: z.string().min(2).max(120),
  restaurantSlug: z.string().min(2).max(60),
  adminEmail: z.string().email().max(254),
  adminName: z.string().max(120).optional(),
  adminPassword: z.string().min(8).max(200),
})

function normaliseSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

export async function createRestaurantWithAdminAction(
  _prevState: any,
  formData: FormData
) {
  const session = await auth()
  requireSuperadmin(session)

  const parsed = createRestaurantWithAdminSchema.safeParse({
    restaurantName: formData.get("restaurantName"),
    restaurantSlug: formData.get("restaurantSlug"),
    adminEmail: formData.get("adminEmail"),
    adminName: formData.get("adminName") || undefined,
    adminPassword: formData.get("adminPassword"),
  })

  if (!parsed.success) {
    return { error: "Datos invalidos. Revisa el formulario." }
  }

  const input = parsed.data
  const slug = normaliseSlug(input.restaurantSlug)

  if (!/^[a-z0-9-]{3,60}$/.test(slug)) {
    return { error: "Slug invalido. Usa letras, numeros y guiones (3-60)." }
  }

  try {
    const passwordHash = await bcrypt.hash(input.adminPassword, 10)

    const result = await prisma.$transaction(async (tx) => {
      const existingRestaurant = await tx.restaurant.findUnique({
        where: { slug },
        select: { id: true },
      })
      if (existingRestaurant) {
        throw new Error("RESTAURANT_SLUG_TAKEN")
      }

      const existingUser = await tx.user.findUnique({
        where: { email: input.adminEmail.toLowerCase() },
        select: { id: true },
      })
      if (existingUser) {
        throw new Error("USER_EMAIL_TAKEN")
      }

      const restaurant = await tx.restaurant.create({
        data: {
          name: input.restaurantName,
          slug,
          status: RestaurantStatus.ACTIVE,
        },
      })

      const user = await tx.user.create({
        data: {
          email: input.adminEmail.toLowerCase(),
          name: input.adminName,
          passwordHash,
          role: UserRole.RESTAURANT_ADMIN,
        },
      })

      await tx.membership.create({
        data: {
          userId: user.id,
          restaurantId: restaurant.id,
          role: MembershipRole.RESTAURANT_ADMIN,
        },
      })

      return { restaurant, user }
    })

    // Non-blocking: email can be disabled via env.
    await sendOnboardingEmail({
      to: result.user.email,
      restaurantName: result.restaurant.name,
      restaurantSlug: result.restaurant.slug,
      password: input.adminPassword,
    }).catch((err) => console.warn("[onboarding email] failed", err))

    revalidatePath("/admin/restaurants")
    return { success: true, restaurant: result.restaurant, user: result.user }
  } catch (err: any) {
    const msg = String(err?.message ?? "")
    if (msg === "RESTAURANT_SLUG_TAKEN") {
      return { error: "Ya existe un restaurante con ese slug." }
    }
    if (msg === "USER_EMAIL_TAKEN") {
      return { error: "Ya existe un usuario con ese email." }
    }
    console.error("createRestaurantWithAdminAction error", err)
    return { error: "No se pudo crear el restaurante. Intentalo de nuevo." }
  }
}
