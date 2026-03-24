"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function updateRestaurantSettingsAction(prevState: any, formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return { error: "No autorizado." }
    }
    const restaurantId = session.user.restaurantId as string

    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string
    const city = formData.get("city") as string
    const postalCode = formData.get("postalCode") as string

    if (!name) {
      return { error: "El nombre del restaurante no puede estar vacío." }
    }

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        name,
        description,
        phone,
        address,
        city,
        postalCode
      }
    })

    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch(error) {
    return { error: "Fallo al actualizar la configuración."}
  }
}

export async function updateLegalSettingsAction(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return { error: "No autorizado." }
    }
    const restaurantId = session.user.restaurantId as string

    const legalNotice = formData.get("legalNotice") as string
    const privacyPolicy = formData.get("privacyPolicy") as string
    const cookiesPolicy = formData.get("cookiesPolicy") as string
    const termsConditions = formData.get("termsConditions") as string

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        legalNotice,
        privacyPolicy,
        cookiesPolicy,
        termsConditions
      }
    })

    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch(error) {
    console.error("updateLegal", error)
    return { error: "Fallo al actualizar los textos legales."}
  }
}
