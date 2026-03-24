import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TablesClient } from "./TablesClient";

export default async function TablesManagementPage() {
  const session = await auth();

  if (!session || (!session.user?.restaurantId && !session.user?.isSuperadmin)) {
    redirect("/");
  }

  const restaurantId = session.user?.restaurantId as string;

  const userInfo = {
    name: session.user?.name,
    email: session.user?.email,
    role: session.user?.role,
    isSuperadmin: session.user?.isSuperadmin,
    slug: session.user?.restaurantSlug || "demo-restaurant",
  };

  const rooms = await prisma.room.findMany({
    where: { 
      restaurantId: session.user.isSuperadmin ? undefined : restaurantId 
    },
    include: {
      tables: {
        orderBy: { name: "asc" }
      }
    },
    orderBy: { createdAt: "asc" },
  });

  // Also fetch tables without room (just in case)
  const orphanTables = await prisma.restaurantTable.findMany({
    where: { 
      restaurantId: session.user.isSuperadmin ? undefined : restaurantId,
      roomId: null
    },
    orderBy: { name: "asc" }
  });

  return (
    <DashboardLayout user={userInfo} title="ZapiQR">
      <TablesClient rooms={rooms as any} orphanTables={orphanTables as any} slug={userInfo.slug} />
    </DashboardLayout>
  );
}
