"use server";

import { prisma } from "@/lib/prisma";
import { setCustomerSession, clearCustomerSession } from "@/lib/customerAuth";

export async function requestCustomerOtpAction(restaurantId: string, phoneInput: string) {
  try {
    const phone = phoneInput.replace(/\s+/g, "");
    if (!phone || phone.length < 8) return { error: "Teléfono no válido." };

    let customer = await prisma.customer.findFirst({
      where: { restaurantId, phone }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: { restaurantId, phone }
      });
    }

    const otp = process.env.NODE_ENV === "development" ? "0000" : Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000);

    await (prisma.customer as any).update({
      where: { id: customer.id },
      data: { otpCode: otp, otpExpiresAt: expiresAt }
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV SMS] OTP para ${phone}: ${otp}`);
    }

    return { success: true };
  } catch (err) {
    console.error("requestCustomerOtp", err);
    return { error: "Error al solicitar código." };
  }
}

export async function verifyCustomerOtpAction(restaurantId: string, phoneInput: string, code: string) {
  try {
    const phone = phoneInput.replace(/\s+/g, "");
    const customer = await prisma.customer.findFirst({
      where: { restaurantId, phone, otpCode: code }
    });

    if (!customer) return { error: "Código incorrecto." };
    if (!customer.otpExpiresAt || customer.otpExpiresAt < new Date()) {
      return { error: "El código ha caducado." };
    }

    await (prisma.customer as any).update({
      where: { id: (customer as any).id },
      data: { isRegistered: true, otpCode: null, otpExpiresAt: null }
    });

    await setCustomerSession((customer as any).id, restaurantId);
    return { success: true, customerId: (customer as any).id };
  } catch (err) {
    console.error("verifyCustomerOtp", err);
    return { error: "Error interno verificando el código." };
  }
}

export async function customerLogoutAction() {
  await clearCustomerSession();
  return { success: true };
}

export async function updateCustomerProfileAction(
  customerId: string,
  data: { name?: string; email?: string }
) {
  try {
    await prisma.customer.update({
      where: { id: customerId },
      data
    });
    return { success: true };
  } catch (err) {
    console.error("updateCustomerProfile", err);
    return { error: "Error al guardar los datos." };
  }
}

export async function addCustomerAddressAction(
  customerId: string,
  address: { label: string; street: string; postalCode: string; city: string }
) {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { error: "Cliente no encontrado." };

    const existing = (customer.savedAddresses as any[] | null) || [];
    const updated = [...existing, { id: Date.now().toString(), ...address }];

    await prisma.customer.update({
      where: { id: customerId },
      data: { savedAddresses: updated }
    });
    return { success: true };
  } catch (err) {
    console.error("addCustomerAddress", err);
    return { error: "Error al guardar la dirección." };
  }
}

export async function removeCustomerAddressAction(customerId: string, addressId: string) {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { error: "Cliente no encontrado." };

    const existing = (customer.savedAddresses as any[] | null) || [];
    const updated = existing.filter((a: any) => a.id !== addressId);

    await prisma.customer.update({
      where: { id: customerId },
      data: { savedAddresses: updated }
    });
    return { success: true };
  } catch (err) {
    console.error("removeCustomerAddress", err);
    return { error: "Error al eliminar la dirección." };
  }
}

export async function getCustomerDataAction(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { error: "No encontrado." };

    const orders = await prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { items: true }
    });

    return { success: true, customer, orders };
  } catch (err) {
    return { error: "Error al cargar datos." };
  }
}

export async function submitReviewAction(data: {
  restaurantId: string
  orderId?: string
  customerId?: string
  rating: number
  comment?: string
  customerName?: string
  images?: string[]
}) {
  try {
    // Check if review already exists for this order (only if orderId is provided)
    if (data.orderId) {
      const existing = await (prisma as any).review.findUnique({
        where: { orderId: data.orderId }
      })
      if (existing) return { error: "Ya has valorado este pedido." }
    }

    const review = await (prisma as any).review.create({
      data: {
        restaurantId: data.restaurantId,
        orderId: data.orderId,
        customerId: data.customerId,
        rating: data.rating,
        comment: data.comment,
        customerName: data.customerName,
        images: data.images || []
      }
    })

    return { success: true, review }
  } catch (err) {
    console.error("submitReview", err)
    return { error: "Error al enviar la valoración." }
  }
}

export async function getRestaurantReviewsAction(restaurantId: string) {
  try {
    const reviews = await (prisma as any).review.findMany({
      where: { restaurantId, isVisible: true },
      orderBy: { createdAt: "desc" },
      take: 20
    })
    return { success: true, reviews }
  } catch (err) {
    return { error: "Error al cargar valoraciones." }
  }
}
