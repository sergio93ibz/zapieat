import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StorefrontLayout } from "../../StorefrontLayout";
import { KioskStorefront } from "./KioskStorefront";
import { getCustomerSession } from "@/lib/customerAuth";

export default async function TableKioskPage({ 
  params 
}: { 
  params: Promise<{ slug: string, tableId: string }> 
}) {
  const { slug, tableId } = await params;

  // Fetch restaurant and table
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      categories: {
        where: { isVisible: true },
        orderBy: { position: "asc" },
        include: {
          products: {
            where: { isAvailable: true },
            orderBy: { position: "asc" },
            include: {
              modifierGroups: {
                include: {
                  modifiers: {
                    where: { isAvailable: true },
                    orderBy: { position: "asc" }
                  }
                },
                orderBy: { position: "asc" }
              }
            }
          }
        }
      }
    }
  });

  if (!restaurant) notFound();

  const table = await prisma.restaurantTable.findUnique({
    where: { id: tableId }
  });

  if (!table || table.restaurantId !== restaurant.id || !table.isActive) notFound();

  // Fetch last orders if customer is logged in
  const customerSession = await getCustomerSession();
  let lastOrders: any[] = [];
  if (customerSession && customerSession.restaurantId === restaurant.id) {
     const cust = await prisma.customer.findUnique({ 
       where: { id: customerSession.customerId },
       include: {
         orders: {
           where: { restaurantId: restaurant.id },
           orderBy: { createdAt: 'desc' },
           take: 2,
           include: {
             items: {
               include: {
                 modifiers: true
               }
             }
           }
         }
       }
     }) as any;

     if (cust) {
       lastOrders = JSON.parse(JSON.stringify(cust.orders || []));
     }
  }

  // Serialize to handle Decimal objects for Client Component
  const serializedRestaurant = JSON.parse(JSON.stringify(restaurant));
  const serializedTable = JSON.parse(JSON.stringify(table));

  return (
    <StorefrontLayout slug={slug}>
       <KioskStorefront 
         restaurant={serializedRestaurant} 
         table={serializedTable} 
         lastOrders={lastOrders}
       />
    </StorefrontLayout>
  );
}
