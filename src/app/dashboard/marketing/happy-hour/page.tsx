import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { HappyHourConfig } from "./HappyHourConfig";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function HappyHourPage() {
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

  const restaurant = await (prisma as any).restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      happyHourActive: true,
      happyHourStartTime: true,
      happyHourEndTime: true,
      happyHourDays: true,
    }
  });

  const products = await (prisma as any).product.findMany({
    where: { restaurantId },
    select: {
      id: true,
      name: true,
      price: true,
      happyHourEnabled: true,
      happyHourDiscountType: true,
      happyHourDiscount: true
    },
    orderBy: { name: "asc" },
  });

  return (
    <DashboardLayout user={userInfo} title="Happy Hour">
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1rem" }}>
        
        <div style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard/marketing" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#6b7280", textDecoration: "none" }}>
            <ArrowLeft size={20} />
            Volver
          </Link>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "bold", margin: 0, color: "#fafaf9" }}>Happy Hour Global</h1>
        </div>

        <div style={{ backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.1)", padding: "1.5rem" }}>
           <p style={{ color: "#a8a29e", marginBottom: "1.5rem" }}>
             Configura las reglas globales de tu <strong>Happy Hour</strong> y selecciona a qué productos de tu carta se aplica esta franja de descuento. Mucho más simple y rápido.
           </p>
           
           <HappyHourConfig restaurant={restaurant} products={products} />
        </div>
      </div>
    </DashboardLayout>
  );
}
