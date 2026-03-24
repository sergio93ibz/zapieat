import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import styles from "../restaurants/restaurants.module.css";
import { User as UserIcon, Shield, Mail, Calendar } from "lucide-react";

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session || !session.user?.isSuperadmin) {
    redirect("/");
  }

  const userInfo = {
    name: session.user?.name,
    email: session.user?.email,
    role: session.user?.role,
    isSuperadmin: session.user?.isSuperadmin,
  };

  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: { restaurant: true }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardLayout user={userInfo} title="Usuarios del Sistema">
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Gestión de Cuentas</span>
          <p style={{ color: '#a8a29e', fontSize: '0.875rem' }}>Visualiza quién tiene acceso a la plataforma.</p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre / Email</th>
                <th>Rol</th>
                <th>Vinculación / Restaurante</th>
                <th>Miembro desde</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316' }}>
                         <UserIcon size={16} />
                      </div>
                      <div>
                        <span className={styles.boldText}>{u.name || "Sin nombre"}</span>
                        <span className={styles.subText}>{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${u.role === 'SUPERADMIN' ? styles.badgeActive : styles.badgePending}`} style={{ backgroundColor: u.role === 'SUPERADMIN' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(14, 165, 233, 0.1)', color: u.role === 'SUPERADMIN' ? '#a855f7' : '#0ea5e9' }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.memberships.length > 0 ? (
                      <div>
                        <span className={styles.boldText}>{u.memberships[0].restaurant.name}</span>
                        <span className={styles.subText}>{u.memberships[0].role.toLowerCase()}</span>
                      </div>
                    ) : (
                      <span className={styles.subText}>Sin asignar</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#78716c' }}>
                       <Calendar size={14} />
                       {new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(u.createdAt)}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className={styles.actionBtn}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
