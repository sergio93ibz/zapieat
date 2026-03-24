import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RoomsClient } from "./RoomsClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function RoomsPage() {
  const session = await auth();

  if (!session?.user?.restaurantId) {
    redirect("/");
  }

  const restaurantId = session.user.restaurantId as string;

  const userInfo = {
    name: session.user?.name,
    email: session.user?.email,
    role: session.user?.role,
    isSuperadmin: session.user?.isSuperadmin,
    slug: session.user?.restaurantSlug || "demo-restaurant",
  };

  const rooms = await (prisma as any).room.findMany({
    where: { restaurantId },
    include: {
      tables: {
        orderBy: { name: "asc" }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return (
    <DashboardLayout user={userInfo} title="Organizador de Mesas">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1rem" }}>
        
        <div style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard/zapiqr" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#6b7280", textDecoration: "none" }}>
            <ArrowLeft size={20} />
            Volver a ZapiQR
          </Link>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "bold", margin: 0, color: "#fafaf9" }}>Salones y Mesas</h1>
        </div>

        <RoomsClient rooms={rooms} />
        
      </div>
    </DashboardLayout>
  );
}
