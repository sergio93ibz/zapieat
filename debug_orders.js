const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const orders = await prisma.order.findMany({
    where: { status: { notIn: ['CANCELLED', 'PENDING_PAYMENT'] } },
    include: { restaurant: true }
  });
  console.log(`Found ${orders.length} valid orders.`);
  for (const o of orders) {
    console.log(`Order ${o.id}: total ${o.total}, status ${o.status}, date ${o.createdAt}, restaurant ${o.restaurant.slug}`);
  }
}
main().finally(() => prisma.$disconnect());
