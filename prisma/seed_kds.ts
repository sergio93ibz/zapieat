import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'demo-cro@zapieat.com';
  console.log('Buscando usuario de admin...');
  
  let restaurant = await prisma.restaurant.findFirst({
    where: { slug: 'bar-pepe' },
    include: { products: true, memberships: { include: { user: true } } }
  });

  if (!restaurant || restaurant.products.length === 0) {
    console.log('Usando Demo CRO o crear un producto...');
    restaurant = await prisma.restaurant.findFirst({
      where: { slug: 'demo-cro' },
      include: { products: true, memberships: { include: { user: true } } }
    });
    
    if (restaurant && restaurant.products.length === 0) {
       console.log('Creando producto de prueba');
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
         where: { slug: 'demo-cro' },
         include: { products: true, memberships: { include: { user: true } } }
       });
    }
  }

  if (!restaurant) { console.log('Restaurante no encontrado'); return; }
  
  const adminMembership = restaurant.memberships.find(m => m.role === 'RESTAURANT_ADMIN');
  if (!adminMembership) { console.log('Admin no encontrado'); return; }
  
  const admin = adminMembership.user;
  
  // Establecer contraseña a 123456
  const hash = await bcrypt.hash('123456', 10);
  await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: hash } });
  
  console.log('Login credentials -> Email: ' + admin.email + ' / Pass: 123456');

  const p1 = restaurant.products[0];
  if (!p1) { console.log('Sin productos para hacer pedidos'); return; }

  // Borrar pedidos viejos
  await prisma.order.deleteMany({ where: { restaurantId: restaurant.id } });

  console.log('Creando pedidos...');
  // Pedido 1
  await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: 101,
      status: 'PAID',
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
      restaurantId: restaurant.id,
      orderNumber: 102,
      status: 'PREPARING',
      type: 'DELIVERY',
      customerName: 'Juan P.',
      subtotal: Number(p1.price) * 2,
      total: Number(p1.price) * 2,
      items: { create: [{ productId: p1.id, quantity: 1, productNameSnapshot: p1.name, unitPrice: p1.price }] }
    }
  });

  // Pedido 3
  await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: 103,
      status: 'READY',
      type: 'PICKUP',
      customerName: 'Ana G.',
      subtotal: p1.price,
      total: p1.price,
      items: { create: [{ productId: p1.id, quantity: 1, productNameSnapshot: p1.name, unitPrice: p1.price }] }
    }
  });

  console.log('Orders created successfully! Restaurant Slug: ' + restaurant.slug);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
