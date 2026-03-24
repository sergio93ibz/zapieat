/**
 * modules/menu/service.ts
 * Menu management — always scoped by restaurantId.
 */

import { prisma } from "@/lib/prisma"
import { Category, Product, ModifierGroup, Modifier, Prisma } from "@prisma/client"

// ─── Categories ───────────────────────────────────────────────

export async function listCategories(restaurantId: string) {
  return prisma.category.findMany({
    where: { restaurantId },
    orderBy: { position: "asc" },
    include: { _count: { select: { products: true } } },
  })
}

export async function createCategory(
  restaurantId: string,
  data: { name: string; description?: string; imageUrl?: string; position?: number }
): Promise<Category> {
  return prisma.category.create({
    data: { restaurantId, ...data },
  })
}

export async function updateCategory(
  restaurantId: string,
  id: string,
  data: Partial<{ name: string; description: string; imageUrl: string; position: number; isVisible: boolean }>
): Promise<Category> {
  return prisma.category.update({
    where: { id, restaurantId }, // ensure it belongs to the tenant
    data,
  })
}

export async function deleteCategory(
  restaurantId: string,
  id: string
): Promise<void> {
  await prisma.category.delete({ where: { id, restaurantId } })
}

// ─── Products ─────────────────────────────────────────────────

export async function listProducts(
  restaurantId: string,
  options?: { categoryId?: string; includeUnavailable?: boolean }
) {
  return prisma.product.findMany({
    where: {
      restaurantId,
      ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
      ...(options?.includeUnavailable ? {} : { isAvailable: true }),
    },
    orderBy: { position: "asc" },
    include: {
      modifierGroups: {
        include: { modifiers: { orderBy: { position: "asc" } } },
        orderBy: { position: "asc" },
      },
    },
  })
}

export async function getProductById(
  restaurantId: string,
  id: string
): Promise<Product | null> {
  return prisma.product.findFirst({
    where: { id, restaurantId },
    include: {
      modifierGroups: {
        include: { modifiers: true },
      },
    },
  })
}

export async function createProduct(
  restaurantId: string,
  data: {
    categoryId: string
    name: string
    description?: string
    price: Prisma.Decimal | number
    imageUrl?: string
    preparationTimeMinutes?: number
  }
): Promise<Product> {
  return prisma.product.create({
    data: { restaurantId, ...data },
  })
}

export async function updateProduct(
  restaurantId: string,
  id: string,
  data: Partial<{
    name: string
    description: string
    price: Prisma.Decimal | number
    imageUrl: string
    isAvailable: boolean
    isSoldOut: boolean
    preparationTimeMinutes: number
    position: number
    categoryId: string
  }>
): Promise<Product> {
  return prisma.product.update({ where: { id, restaurantId }, data })
}

export async function deleteProduct(
  restaurantId: string,
  id: string
): Promise<void> {
  await prisma.product.delete({ where: { id, restaurantId } })
}

export async function toggleSoldOut(
  restaurantId: string,
  id: string,
  isSoldOut: boolean
): Promise<Product> {
  return prisma.product.update({
    where: { id, restaurantId },
    data: { isSoldOut },
  })
}

// ─── Modifier Groups ──────────────────────────────────────────

export async function createModifierGroup(
  restaurantId: string,
  productId: string,
  data: { name: string; required?: boolean; minSelections?: number; maxSelections?: number }
): Promise<ModifierGroup> {
  return prisma.modifierGroup.create({
    data: { restaurantId, productId, ...data },
  })
}

export async function createModifier(
  restaurantId: string,
  groupId: string,
  data: { name: string; price?: number }
): Promise<Modifier> {
  return prisma.modifier.create({
    data: { restaurantId, groupId, name: data.name, price: data.price ?? 0 },
  })
}
