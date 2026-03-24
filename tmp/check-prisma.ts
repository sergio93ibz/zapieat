import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Prisma keys:", Object.keys(prisma));
  console.log("RestaurantTable defined:", !!(prisma as any).restaurantTable);
}

main().catch(console.error);
