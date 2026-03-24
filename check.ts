import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.restaurant.findFirst({ select: { slug: true } });
  console.log("SLUG:", r?.slug);
  const s = await prisma.restaurantDeliverySettings.findFirst();
  console.log("SETTINGS:", s);
}
main().finally(() => window? prisma.$disconnect() : null);
