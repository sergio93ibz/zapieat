
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.restaurant.updateMany({
    data: {
      enableLoyalty: true,
      loyaltyPointsPerEuro: 1,
      loyaltyPointsValue: 0.05,
      loyaltyMinPointsToRedeem: 100
    }
  });
  console.log('Updated restaurants:', result.count);
  
  const customers = await prisma.customer.findMany({
    take: 5
  });
  console.log('Sample customers points:', customers.map(c => ({ id: c.id, points: (c as any).loyaltyPoints })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
