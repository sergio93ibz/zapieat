import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import styles from "./marketing.module.css";
import { LoyaltyForm } from "./LoyaltyForm";
import Link from "next/link";
import { Ticket, Star, Clock, Megaphone } from "lucide-react";

export default async function MarketingPage() {
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
      enableLoyalty: true,
      loyaltyPointsPerEuro: true,
      loyaltyPointsValue: true,
      loyaltyMinPointsToRedeem: true,
    }
  });

  return (
    <DashboardLayout user={userInfo} title="Centro de Marketing">
      <div className={styles.container}>
        
        {/* HERO SECTION */}
        <div style={{ backgroundColor: "rgba(249, 115, 22, 0.05)", padding: "2rem", borderRadius: "1rem", border: "1px solid rgba(249, 115, 22, 0.2)", display: "flex", gap: "1.5rem", alignItems: "center" }}>
           <div style={{ backgroundColor: "#f97316", padding: "1rem", borderRadius: "1rem", color: "white" }}>
              <Megaphone size={40} />
           </div>
           <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#fafaf9" }}>Vende más y fideliza clientes</h2>
              <p style={{ margin: 0, color: "#a8a29e", fontSize: "1rem", maxWidth: "600px" }}>
                 Usa estas herramientas para aumentar tu ticket medio, atraer visitas en horas valle y convertir usuarios en clientes recurrentes.
              </p>
           </div>
        </div>

        {/* ACCESOS RÁPIDOS */}
        <div className={styles.marketingGrid}>
           <div className={styles.card}>
              <div className={styles.cardHeader}>
                 <div className={styles.iconWrapper} style={{ backgroundColor: "rgba(56, 189, 248, 0.1)", color: "#38bdf8" }}>
                    <Ticket size={24} />
                 </div>
                 <h3 className={styles.cardTitle}>Cupones de Descuento</h3>
              </div>
              <p className={styles.cardDesc}>Crea códigos promocionales (ej. MENU10) con descuentos en %, dinero fijo o productos gratis. Ideal para redes sociales.</p>
              <Link href="/dashboard/marketing/coupons" className={styles.btnPrimary} style={{ backgroundColor: "#38bdf8", color: "#0c0a09" }}>Gestionar Cupones</Link>
           </div>

           <div className={styles.card}>
              <div className={styles.cardHeader}>
                 <div className={styles.iconWrapper} style={{ backgroundColor: "rgba(168, 85, 247, 0.1)", color: "#a855f7" }}>
                    <Clock size={24} />
                 </div>
                 <h3 className={styles.cardTitle}>Happy Hour & Packs</h3>
              </div>
              <p className={styles.cardDesc}>Configura horas felices bajando el precio automáticamente solo en las horas y días que elijas desde tu panel de marketing.</p>
              <Link href="/dashboard/marketing/happy-hour" className={styles.btnPrimary} style={{ backgroundColor: "#a855f7", color: "white" }}>Gestionar Happy Hour</Link>
           </div>
           
           <div className={styles.card}>
              <div className={styles.cardHeader}>
                 <div className={styles.iconWrapper} style={{ backgroundColor: "rgba(236, 72, 153, 0.1)", color: "#ec4899" }}>
                    <Star size={24} />
                 </div>
                 <h3 className={styles.cardTitle}>Insignias y Destacados</h3>
              </div>
              <p className={styles.cardDesc}>Aplica el diseño Fuego (Más vendido) o Estrella (Recomendado) a tus mejores platos para aumentar su conversión.</p>
              <Link href="/dashboard/marketing/badges" className={styles.btnPrimary} style={{ backgroundColor: "#ec4899", color: "white" }}>Gestionar Insignias</Link>
           </div>
        </div>

        {/* LOYALTY FORM */}
        <LoyaltyForm restaurant={restaurant} />
        
      </div>
    </DashboardLayout>
  );
}
