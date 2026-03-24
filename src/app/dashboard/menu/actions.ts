"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createCategoryAction(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    const restaurantId = session.user.restaurantId as string

    const name = formData.get("name") as string
    const description = formData.get("description") as string

    if (!name) return { error: "El nombre es obligatorio." }

    // Get current max position
    const maxPos = await prisma.category.aggregate({
      where: { restaurantId },
      _max: { position: true }
    })

    await prisma.category.create({
      data: {
        name,
        description,
        position: (maxPos._max.position || 0) + 1,
        restaurantId
      }
    })

    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    return { error: "No se pudo crear la categoría." }
  }
}

export async function createProductAction(prevState: any, formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    const restaurantId = session.user.restaurantId as string

    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const priceStr = formData.get("price") as string
    const categoryId = formData.get("categoryId") as string
    const prepTimeStr = formData.get("preparationTimeMinutes") as string
    const allergens = formData.getAll("allergens") as string[]
    const imageUrl = formData.get("imageUrl") as string
    const isCrossSell = formData.get("isCrossSell") === "on"
    const isCombo = formData.get("isCombo") === "on"

    if (!name || !priceStr || !categoryId) {
      return { error: "Por favor rellena los campos obligatorios." }
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(priceStr),
        categoryId,
        preparationTimeMinutes: parseInt(prepTimeStr || "15"),
        allergens,
        imageUrl,
        isCrossSell,
        isCombo,
        restaurantId,
      } as any
    })

    revalidatePath("/dashboard/menu")
    return { success: true, product }
  } catch (error: any) {
    console.error("createProductAction error:", error)
    return { error: "Fallo al crear el producto: " + error.message }
  }
}

export async function updateCategoryAction(categoryId: string, name: string, description: string) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    const restaurantId = session.user.restaurantId as string

    await prisma.category.update({
      where: { id: categoryId, restaurantId },
      data: { name, description }
    })

    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    return { error: "No se pudo actualizar la categoría." }
  }
}

export async function deleteProductAction(productId: string) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    const restaurantId = session.user.restaurantId as string

    await prisma.product.delete({
      where: { id: productId, restaurantId }
    })

    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    return { error: "No se pudo eliminar el producto." }
  }
}

export async function toggleProductAvailabilityAction(productId: string, isAvailable: boolean) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    const restaurantId = session.user.restaurantId as string

    await prisma.product.update({
      where: { id: productId, restaurantId },
      data: { isAvailable }
    })

    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    return { error: "No se pudo actualizar la disponibilidad." }
  }
}

export async function createModifierGroupAction(productId: string, name: string, min: number, max: number, required: boolean) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    const restaurantId = session.user.restaurantId as string

    const group = await prisma.modifierGroup.create({
      data: {
        productId,
        name,
        minSelections: min,
        maxSelections: max,
        required,
        restaurantId,
      } as any
    })

    revalidatePath("/dashboard/menu")
    return { success: true, group }
  } catch (error) {
    return { error: "No se pudo crear el grupo de modificadores." }
  }
}

export async function deleteModifierGroupAction(groupId: string) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    const restaurantId = session.user.restaurantId as string

    await prisma.modifierGroup.deleteMany({
      where: { id: groupId, restaurantId }
    })

    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    return { error: "No se pudo eliminar el grupo." }
  }
}

export async function updateModifierGroupAction(groupId: string, data: { name?: string; required?: boolean; minSelections?: number; maxSelections?: number }) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    const restaurantId = session.user.restaurantId as string

    await prisma.modifierGroup.updateMany({
      where: { id: groupId, restaurantId },
      data
    })

    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    return { error: "No se pudo actualizar el grupo." }
  }
}

export async function addModifierToGroupAction(groupId: string, name: string, price: number, linkedProductId?: string) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    const restaurantId = session.user.restaurantId as string

    const modifier = await prisma.modifier.create({
      data: {
        groupId,
        restaurantId,
        name,
        price,
        linkedProductId: linkedProductId || null
      } as any
    })

    revalidatePath("/dashboard/menu")
    return { success: true, modifier }
  } catch (error) {
    return { error: "No se pudo añadir el modificador." }
  }
}

export async function deleteModifierAction(modifierId: string) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    const restaurantId = session.user.restaurantId as string

    await prisma.modifier.deleteMany({
      where: { id: modifierId, restaurantId }
    })

    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    return { error: "No se pudo eliminar el modificador." }
  }
}

export async function updateModifierAction(modifierId: string, data: { name?: string; price?: number; linkedProductId?: string | null }) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    const restaurantId = session.user.restaurantId as string

    await prisma.modifier.updateMany({
      where: { id: modifierId, restaurantId },
      data
    })

    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    return { error: "No se pudo actualizar el modificador." }
  }
}

export async function updateProductAction(productId: string, formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return { error: "No autorizado." }
    }
    const restaurantId = session.user.restaurantId as string

    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const priceStr = formData.get("price") as string
    const categoryId = formData.get("categoryId") as string
    const prepTimeStr = formData.get("preparationTimeMinutes") as string
    const allergens = formData.getAll("allergens") as string[]
    const imageUrlRaw = formData.get("imageUrl") as string
    const isCrossSell = formData.get("isCrossSell") === "on"
    const isCombo = formData.get("isCombo") === "on"
    const isOffer = formData.get("isOffer") === "on"
    const offerPriceStr = (formData.get("offerPrice") as string) || ""

    if (!productId || !name || !priceStr || !categoryId) {
      return { error: "Faltan campos obligatorios." }
    }

    const price = parseFloat(priceStr)
    if (!Number.isFinite(price)) {
      return { error: "El precio no es válido." }
    }

    const prepTime = parseInt(prepTimeStr || "0")
    if (!Number.isFinite(prepTime) || prepTime < 0) {
      return { error: "El tiempo de preparación no es válido." }
    }

    let offerPrice: number | null = null
    if (isOffer) {
      const parsed = parseFloat(offerPriceStr)
      if (!Number.isFinite(parsed)) {
        return { error: "El precio de oferta no es válido." }
      }
      offerPrice = parsed
    }

    const updateData: any = {
      name,
      description,
      price,
      categoryId,
      preparationTimeMinutes: prepTime,
      allergens,
      isCrossSell,
      isCombo,
      isOffer,
      offerPrice
    }

    const imageUrl = imageUrlRaw && imageUrlRaw.trim().length > 0 ? imageUrlRaw.trim() : null
    updateData.imageUrl = imageUrl

    await prisma.product.update({
      where: { id: productId, restaurantId },
      data: updateData
    })

    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error: any) {
    console.error("updateProductAction error:", error)
    return { error: `Error de servidor: ${error.message}` }
  }
}

export async function setProductOfferAction(productId: string, isOffer: boolean, offerPrice?: number) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }

    await prisma.product.update({
      where: { id: productId },
      data: {
        isOffer,
        offerPrice: isOffer ? offerPrice : null
      } as any
    })

    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    return { error: "No se pudo actualizar la oferta." }
  }
}

export async function deleteCategoryAction(categoryId: string) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    const restaurantId = session.user.restaurantId as string

    await prisma.category.delete({
      where: { id: categoryId, restaurantId }
    })

    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    return { error: "No se pudo eliminar la categoría." }
  }
}

export async function reorderCategoriesAction(categoryIds: string[]) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }
    
    const updates = categoryIds.map((id, index) => 
      prisma.category.update({
        where: { id },
        data: { position: index + 1 }
      })
    )

    await prisma.$transaction(updates)
    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    return { error: "Fallo al reordenar categorías." }
  }
}

export async function reorderProductsAction(productIds: string[]) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return { error: "No autorizado." }

    const updates = productIds.map((id, index) => 
      prisma.product.update({
        where: { id },
        data: { position: index + 1 }
      })
    )

    await prisma.$transaction(updates)
    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    return { error: "Fallo al reordenar productos." }
  }
}
