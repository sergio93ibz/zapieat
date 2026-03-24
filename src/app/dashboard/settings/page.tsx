import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import styles from "./settings.module.css";
import { SettingsForm } from "./SettingsForm";
import { DeliverySettingsForm } from "./DeliverySettingsForm";
import { LegalSettingsForm } from "./LegalSettingsForm";
import { Globe, Store, Truck, ShieldCheck } from "lucide-react";

export default async function SettingsPage() {
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

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      name: true,
      description: true,
      phone: true,
      address: true,
      city: true,
      postalCode: true,
      slug: true,
      customDomain: true,
      legalNotice: true,
      privacyPolicy: true,
      cookiesPolicy: true,
      termsConditions: true,
    }
  });

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "zapieat.com";

  return (
    <DashboardLayout user={userInfo} title="Configuración del Negocio">
      <div className={styles.container}>

        {/* DOMINIO INFO */}
        <div className={styles.section} style={{ backgroundColor: "rgba(249, 115, 22, 0.05)", borderColor: "rgba(249, 115, 22, 0.2)", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ padding: "1rem", backgroundColor: "rgba(249, 115, 22, 0.1)", borderRadius: "50%", color: "#f97316" }}>
              <Globe size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.125rem", color: "#fafaf9", fontWeight: 600, marginBottom: "0.25rem" }}>
                Tu Dominio Actual
              </h3>
              <p style={{ color: "#a8a29e", fontSize: "0.875rem" }}>
                {restaurant?.customDomain
                  ? `Tu tienda está activa en: https://${restaurant.customDomain}`
                  : `Tu tienda está activa en el subdominio: https://${restaurant?.slug}.${baseDomain}`}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION TABS */}
        <SettingsTabs restaurant={restaurant} />
      </div>
    </DashboardLayout>
  );
}

// Client-side tabs wrapper — needs to be a separate client component
// but since we need interactivity, we'll use a simple anchor approach with search params.
// For simplicity, we render both forms and let DeliverySettingsForm handle its own tabs.
function SettingsTabs({ restaurant }: { restaurant: any }) {
  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      {/* Perfil del Local */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <Store size={18} color="#f97316" />
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Perfil del Local</h2>
        </div>
        <SettingsForm initialData={restaurant} />
      </div>

      {/* Horarios y Reparto */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <Truck size={18} color="#f97316" />
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Horarios, Reparto y Vacaciones</h2>
        </div>
        <DeliverySettingsForm />
      </div>

      {/* Textos Legales */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <ShieldCheck size={18} color="#f97316" />
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Privacidad, Cookies y Avisos Legales</h2>
        </div>
        <LegalSettingsForm initialData={restaurant} />
      </div>
    </div>
  )
}
