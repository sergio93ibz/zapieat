/**
 * prisma/seed.ts
 * Seeds the database with a superadmin user and a sample restaurant.
 *
 * Run with: npx prisma db seed
 */

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { UserRole, RestaurantStatus, MembershipRole } from "@prisma/client"
import bcrypt from "bcryptjs"
import { prisma } from "../src/lib/prisma"

async function main() {
  console.log("🌱 Seeding database...")

  // ── Superadmin ────────────────────────────────────────────
  const superadminEmail = "admin@zapieat.com"
  const superadmin = await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {},
    create: {
      email: superadminEmail,
      passwordHash: await bcrypt.hash("zapieat-admin-2024!", 12),
      name: "ZapiEat Admin",
      role: UserRole.SUPERADMIN,
    },
  })
  console.log("✅ Superadmin:", superadmin.email)

  // ── Sample Plan ───────────────────────────────────────────
  const plan = await prisma.plan.upsert({
    where: { slug: "starter" },
    update: {},
    create: {
      name: "Starter",
      slug: "starter",
      price: 29.99,
      maxProducts: 100,
      maxOrders: 1000,
    },
  })
  console.log("✅ Plan:", plan.name)

  // ── Sample Restaurant ─────────────────────────────────────
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo-restaurant" },
    update: {},
    create: {
      slug: "demo-restaurant",
      name: "Demo Restaurant",
      description: "A sample restaurant to test ZapiEat",
      status: RestaurantStatus.ACTIVE,
      planId: plan.id,
    },
  })
  console.log("✅ Restaurant:", restaurant.name)

  // ── Restaurant Admin User ─────────────────────────────────
  const adminEmail = "restaurante@demo.com"
  const restaurantAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash("demo-password-2024!", 12),
      name: "Demo Admin",
      role: UserRole.RESTAURANT_ADMIN,
    },
  })

  await prisma.membership.upsert({
    where: {
      userId_restaurantId: {
        userId: restaurantAdmin.id,
        restaurantId: restaurant.id,
      },
    },
    update: {},
    create: {
      userId: restaurantAdmin.id,
      restaurantId: restaurant.id,
      role: MembershipRole.RESTAURANT_ADMIN,
    },
  })
  console.log("✅ Restaurant Admin:", restaurantAdmin.email)

  // ── Sample Menu ────────────────────────────────────────────
  const category = await prisma.category.upsert({
    where: { id: "seed-category-pizzas" },
    update: {},
    create: {
      id: "seed-category-pizzas",
      restaurantId: restaurant.id,
      name: "Pizzas",
      position: 1,
    },
  })

  await prisma.product.upsert({
    where: { id: "seed-product-margherita" },
    update: {},
    create: {
      id: "seed-product-margherita",
      restaurantId: restaurant.id,
      categoryId: category.id,
      name: "Pizza Margherita",
      description: "Tomate, mozzarella, albahaca",
      price: 9.99,
      preparationTimeMinutes: 15,
    },
  })

  console.log("✅ Sample menu created")

  // ── Opening Hours (Mon-Sun) ────────────────────────────────
  for (let day = 0; day <= 6; day++) {
    await prisma.openingHour.upsert({
      where: { restaurantId_dayOfWeek: { restaurantId: restaurant.id, dayOfWeek: day } },
      update: {},
      create: {
        restaurantId: restaurant.id,
        dayOfWeek: day,
        openTime: "12:00",
        closeTime: "23:00",
        isClosed: day === 1, // Monday closed
      },
    })
  }
  console.log("✅ Opening hours created")

  console.log("\n🎉 Seed complete!\n")
  console.log("Superadmin login:")
  console.log("  Email:    admin@zapieat.com")
  console.log("  Password: zapieat-admin-2024!\n")
  console.log("Restaurant admin login:")
  console.log("  Email:    restaurante@demo.com")
  console.log("  Password: demo-password-2024!")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
