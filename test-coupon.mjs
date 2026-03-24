import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const r = await prisma.restaurant.findFirst();
  if (!r) {
    console.log("No restaurant found");
    return;
  }
  
  // Find a coupon
  const c = await prisma.$queryRaw`SELECT * FROM coupons WHERE "restaurantId" = ${r.id} LIMIT 1`;
  console.log("Coupon found:", c);
  
  const couponData = await prisma.coupon.findFirst({
     where: { restaurantId: r.id }
  }).catch(e => console.error("Error finding coupon:", e));
  
  console.log(couponData);

  const res = await fetch(`http://localhost:3000/api/storefront/${r.slug}/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: couponData ? couponData.code : 'TEST', cartSubtotal: 100 })
  });

  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}

run().finally(() => prisma.$disconnect());
