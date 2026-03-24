import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { OrdersBoardClient } from "./OrdersBoardClient";

export default async function RestaurantOrdersPage() {
  const session = await auth();

  // MVP: only restaurant users (superadmin board can come later)
  if (!session?.user?.restaurantId) {
    redirect("/");
  }

  const restaurantId = session.user.restaurantId as string;

  // Preparamos los datos del usuario para el Dashboard
  const userInfo = {
    name: session.user?.name,
    email: session.user?.email,
    role: session.user?.role,
    isSuperadmin: session.user?.isSuperadmin,
    slug: session.user?.restaurantSlug || "demo-restaurant",
  };

  // Obtener pedidos en tiempo real del restaurante actual (filtramos para no traer cancelados)
  const orders = await prisma.order.findMany({
    where: { 
      restaurantId,
      status: { notIn: ["CANCELLED", "REFUNDED", "DELIVERED"] }
    },
    include: {
      items: true,
      customer: true,
      table: true
    },
    orderBy: { createdAt: "asc" },
  });

  const initialOrders = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    customerName: o.customerName ?? o.customer?.name ?? null,
    isDelivery: o.isDelivery,
    type: o.type,
    tableName: o.table?.name ?? null,
    total: o.total.toString(),
    items: o.items.map((it) => ({
      quantity: it.quantity,
      productNameSnapshot: it.productNameSnapshot,
    })),
  }))

  return (
    <DashboardLayout user={userInfo} title="ZapiOrders">
      <OrdersBoardClient initialOrders={initialOrders} pollIntervalMs={4000} />
    </DashboardLayout>
  );
}
