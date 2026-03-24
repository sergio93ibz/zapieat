/**
 * modules/restaurants/service.ts
 * CRUD operations for restaurants — Superadmin & internal use only.
 */

import { prisma } from "@/lib/prisma"
import { Restaurant, RestaurantStatus } from "@prisma/client"

export interface CreateRestaurantInput {
  slug: string
  name: string
  description?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  planId?: string
}

export interface UpdateRestaurantInput {
  name?: string
  description?: string
  logoUrl?: string
  coverUrl?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  customDomain?: string
}

export async function createRestaurant(
  input: CreateRestaurantInput
): Promise<Restaurant> {
  return prisma.restaurant.create({
    data: {
      slug: input.slug.toLowerCase().replace(/\s+/g, "-"),
      name: input.name,
      description: input.description,
      phone: input.phone,
      address: input.address,
      city: input.city,
      postalCode: input.postalCode,
      planId: input.planId,
      status: RestaurantStatus.PENDING,
    },
  })
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  return prisma.restaurant.findUnique({ where: { id } })
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  return prisma.restaurant.findUnique({ where: { slug } })
}

export async function listRestaurants(options?: {
  status?: RestaurantStatus
  skip?: number
  take?: number
}) {
  return prisma.restaurant.findMany({
    where: options?.status ? { status: options.status } : undefined,
    skip: options?.skip ?? 0,
    take: options?.take ?? 50,
    orderBy: { createdAt: "desc" },
    include: { plan: true, _count: { select: { orders: true } } },
  })
}

export async function updateRestaurant(
  id: string,
  input: UpdateRestaurantInput
): Promise<Restaurant> {
  return prisma.restaurant.update({ where: { id }, data: input })
}

export async function suspendRestaurant(id: string): Promise<Restaurant> {
  return prisma.restaurant.update({
    where: { id },
    data: { status: RestaurantStatus.SUSPENDED },
  })
}

export async function activateRestaurant(id: string): Promise<Restaurant> {
  return prisma.restaurant.update({
    where: { id },
    data: { status: RestaurantStatus.ACTIVE },
  })
}

export async function countRestaurants(status?: RestaurantStatus): Promise<number> {
  return prisma.restaurant.count({
    where: status ? { status } : undefined,
  })
}
