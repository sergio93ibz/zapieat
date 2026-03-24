"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

export async function registerRestaurantAction(data: {
  restaurantName: string;
  slug: string;
  ownerName: string;
  email: string;
  password: string;
}) {
  try {
    const { restaurantName, slug, ownerName, email, password } = data;

    // 1. Verify if slug or email exist
    const existingRestaurant = await prisma.restaurant.findUnique({ where: { slug } });
    if (existingRestaurant) {
      return { error: "Este enlace ya está en uso. Por favor, elige otro." };
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "Este correo electrónico ya está registrado." };
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create the entities using a transaction
    await prisma.$transaction(async (tx) => {
      // Create Restaurant
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          slug: slug,
          status: "ACTIVE", // Start active for the trial
        },
      });

      // Create User
      const user = await tx.user.create({
        data: {
          name: ownerName,
          email: email,
          passwordHash: hashedPassword,
          role: "RESTAURANT_ADMIN",
        },
      });

      // Create Membership
      await tx.membership.create({
        data: {
          userId: user.id,
          restaurantId: restaurant.id,
          role: "RESTAURANT_ADMIN",
        },
      });
    });

    // 4. Send Welcome Email via Resend (will only execute successfully if RESEND_API_KEY is available)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "ZapiEat <hola@zapieat.com>", // You might need a verified domain in Resend
          to: email,
          subject: "¡Bienvenido a ZapiEat! Tus datos de acceso",
          html: `
            <div style="font-family: sans-serif; color: #171717;">
              <h1 style="color: #22c55e;">¡Hola ${ownerName}! Bienvenido a ZapiEat</h1>
              <p>Tu restaurante <strong>${restaurantName}</strong> se ha creado correctamente.</p>
              <p>Ya puedes acceder a tu panel de control (ZapiDashboard) para configurar tu carta, gestionar tus mesas y empezar a recibir pedidos sin pagar comisiones abusivas.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Tus datos de acceso:</h3>
                <p><strong>URL de tu carta:</strong> <a href="https://zapieat.com/${slug}">zapieat.com/${slug}</a></p>
                <p><strong>Panel de Control:</strong> <a href="https://zapieat.com/login">zapieat.com/login</a></p>
                <p><strong>Email:</strong> ${email}</p>
              </div>

              <p>Si tienes alguna pregunta, responde a este correo y te ayudaremos encantados.</p>
              <p>El equipo de ZapiEat</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // We log it but do not fail the registration process
      }
    } else {
      console.log("No RESEND_API_KEY available. Welcome email not sent to", email);
    }

    return { success: true };

  } catch (error: any) {
    console.error("Registration error:", error);
    return { error: "Ocurrió un error inesperado al procesar tu alta. Inténtalo de nuevo." };
  }
}
