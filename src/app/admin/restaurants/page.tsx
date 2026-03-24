import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import styles from "./restaurants.module.css";
import { MoreVertical } from "lucide-react";
import { CreateRestaurantModal } from "./CreateRestaurantModal";

export default async function AdminRestaurantsPage() {
  const session = await auth();

  // Protección: Solo usuarios autenticados que sean Superadmins
  if (!session || !session.user?.isSuperadmin) {
    redirect("/");
  }

  // Preparamos los datos del usuario para el Dashboard
  const userInfo = {
    name: session.user?.name,
    email: session.user?.email,
    role: session.user?.role,
    isSuperadmin: session.user?.isSuperadmin,
  };

  // Obtener la lista de restaurantes y sus planes desde PostgreSQL
  const restaurants = await prisma.restaurant.findMany({
    include: {
      plan: true,
      _count: {
        select: { orders: true, products: true }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ACTIVE": return styles.badgeActive;
      case "PENDING": return styles.badgePending;
      case "SUSPENDED": return styles.badgeSuspended;
      default: return "";
    }
  };

  return (
    <DashboardLayout user={userInfo} title="Gestión de Restaurantes">
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Todos los Tenants</span>
          <CreateRestaurantModal />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Restaurante</th>
                <th>Dominio / Slug</th>
                <th>Estado</th>
                <th>Plan Actual</th>
                <th>Estadísticas</th>
                <th>Registro</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem" }}>
                    No hay restaurantes registrados. ¡Crea el primero!
                  </td>
                </tr>
              ) : (
                restaurants.map((rest) => (
                  <tr key={rest.id}>
                    <td>
                      <span className={styles.boldText}>{rest.name}</span>
                      <span className={styles.subText}>{rest.description || "Sin descripción"}</span>
                    </td>
                    <td>
                      <span className={styles.boldText}>{rest.customDomain || "Sin dominio propio"}</span>
                      <span className={styles.subText}>/{rest.slug}</span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getStatusBadgeClass(rest.status)}`}>
                        {rest.status}
                      </span>
                    </td>
                    <td>
                      <span className={styles.boldText}>{rest.plan?.name || "Sin plan"}</span>
                      <span className={styles.subText}>
                        {rest.plan?.price ? `${Number(rest.plan.price)}€ / mes` : "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className={styles.boldText}>{rest._count.orders} pedidos</span>
                      <span className={styles.subText}>{rest._count.products} productos</span>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(rest.createdAt)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className={styles.actionBtn}>
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
