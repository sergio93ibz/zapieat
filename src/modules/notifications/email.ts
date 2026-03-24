import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { MembershipRole } from "@prisma/client"

export async function sendOnboardingEmail(params: {
  to: string
  restaurantName: string
  restaurantSlug: string
  password: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const loginUrl = `${appUrl}/login`
  const storefrontUrl = `${appUrl}/${params.restaurantSlug}`

  return sendEmail({
    to: params.to,
    subject: `Acceso a ${params.restaurantName} en ZapiEat`,
    html: `
      <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
        <h2>Bienvenido a ZapiEat</h2>
        <p style="margin:0 0 12px; color:#475569;"><strong>Tap. Order. Enjoy.</strong> Pide en segundos. Sin esperas.</p>
        <p>Tu restaurante <strong>${params.restaurantName}</strong> ya esta activo.</p>
        <p><strong>Acceso:</strong></p>
        <ul>
          <li>Login: <a href="${loginUrl}">${loginUrl}</a></li>
          <li>Email: ${params.to}</li>
          <li>Password: ${params.password}</li>
        </ul>
        <p><strong>Tu carta publica:</strong> <a href="${storefrontUrl}">${storefrontUrl}</a></p>
        <p>Recomendacion: cambia la contrasena tras el primer acceso.</p>
      </div>
    `,
    text: `Bienvenido a ZapiEat. Tap. Order. Enjoy. Login: ${loginUrl} Email: ${params.to} Password: ${params.password} Storefront: ${storefrontUrl}`,
  })
}

export async function sendNewOrderEmail(params: {
  restaurantId: string
  orderId: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const order = await prisma.order.findFirst({
    where: { id: params.orderId, restaurantId: params.restaurantId },
    include: { items: { include: { modifiers: true } }, restaurant: true },
  })

  if (!order) return { sent: false }

  const adminEmails = await prisma.membership.findMany({
    where: {
      restaurantId: params.restaurantId,
      role: MembershipRole.RESTAURANT_ADMIN,
    },
    select: { user: { select: { email: true } } },
  })

  const to = adminEmails.map((m) => m.user.email).filter(Boolean)
  if (to.length === 0) return { sent: false }

  const dashboardUrl = `${appUrl}/dashboard/orders`
  const title = `Nuevo pedido #${String(order.orderNumber).padStart(4, "0")} - ${order.restaurant.name}`

  const itemsHtml = order.items
    .map((i) => {
      const mods = i.modifiers.map((m) => `+ ${m.modifierNameSnapshot}`).join(", ")
      return `<li>${i.quantity}x ${i.productNameSnapshot}${mods ? ` <small style="color:#666">(${mods})</small>` : ""}</li>`
    })
    .join("")

  return sendEmail({
    to,
    subject: title,
    html: `
      <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
        <h2>${title}</h2>
        <p><strong>Total:</strong> ${Number(order.total).toFixed(2)} EUR</p>
        <p><strong>Cliente:</strong> ${order.customerName ?? "-"} (${order.customerPhone ?? "-"})</p>
        <p><strong>Entrega:</strong> ${order.isDelivery ? "A domicilio" : "Recogida"}</p>
        <p><strong>Direccion:</strong> ${order.deliveryAddress ?? "-"}</p>
        <p><strong>Items:</strong></p>
        <ul>${itemsHtml}</ul>
        <p><a href="${dashboardUrl}">Abrir tablero de pedidos</a></p>
      </div>
    `,
    text: `${title} Total ${Number(order.total).toFixed(2)} EUR - ${dashboardUrl}`,
  })
}
