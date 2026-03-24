import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    let restaurant = await prisma.restaurant.findFirst({
      where: { slug: "bar-pepe" },
      include: { products: true, memberships: { include: { user: true } } }
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant bar-pepe not found" });
    }

    if (restaurant.products.length === 0) {
       const cat = await prisma.category.create({ data: { restaurantId: restaurant.id, name: 'Principal' } });
       await prisma.product.create({
         data: {
           restaurantId: restaurant.id,
           categoryId: cat.id,
           name: 'Pizza Margarita',
           price: 10.00
         }
       });
       restaurant = await prisma.restaurant.findFirst({
         where: { slug: "demo-cro" },
         include: { products: true, memberships: { include: { user: true } } }
       });
    }

    const adminMembership = restaurant!.memberships.find(m => m.role === 'RESTAURANT_ADMIN');
    const admin = adminMembership!.user;
    
    // Hash password to 123456 just in case
    const hash = await bcrypt.hash('123456', 10);
    await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: hash } });

    const p1 = restaurant!.products[0];

    // Clear old orders
    await prisma.order.deleteMany({ where: { restaurantId: restaurant!.id } });

    // Pedido 1
    await prisma.order.create({
      data: {
        restaurantId: restaurant!.id,
        orderNumber: 101,
        status: 'PREPARING',
        type: 'TABLE',
        customerName: 'Mesa 4',
        subtotal: p1.price,
        total: p1.price,
        items: { create: [{ productId: p1.id, quantity: 2, productNameSnapshot: p1.name, unitPrice: p1.price, notes: 'Sin cebolla' }] }
      }
    });

    // Pedido 2
    await prisma.order.create({
      data: {
        restaurantId: restaurant!.id,
        orderNumber: 102,
        status: 'PAID',
        type: 'DELIVERY',
        customerName: 'Juan P.',
        subtotal: Number(p1.price) * 2,
        total: Number(p1.price) * 2,
        isDelivery: true,
        deliveryAddress: "Calle Principal 123",
        items: { create: [{ productId: p1.id, quantity: 1, productNameSnapshot: p1.name, unitPrice: p1.price }] }
      }
    });

    // Pedido 3
    await prisma.order.create({
      data: {
        restaurantId: restaurant!.id,
        orderNumber: 103,
        status: 'READY',
        type: 'PICKUP',
        customerName: 'Ana G.',
        subtotal: p1.price,
        total: p1.price,
        items: { create: [{ productId: p1.id, quantity: 1, productNameSnapshot: p1.name, unitPrice: p1.price }] }
      }
    });

    return NextResponse.json({ success: true, email: admin.email, password: "123456" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
