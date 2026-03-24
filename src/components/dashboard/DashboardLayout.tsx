"use client";

import React from "react";
import styles from "./DashboardLayout.module.css";
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut,
  Utensils,
  ShoppingBag,
  MenuSquare,
  Eye,
  Gift
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PauseContainer } from "./PauseContainer";

interface UserInfo {
  name?: string | null;
  email?: string | null;
  role?: string;
  isSuperadmin?: boolean;
  slug?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: UserInfo;
  title: string;
}

export function DashboardLayout({ children, user, title }: DashboardLayoutProps) {
  
  // Distintas opciones de menú según el rol
  const superadminNav = [
    { label: "ZapiPanel", href: "/dashboard", icon: <LayoutDashboard className={styles.navItemIcon} /> },
    { label: "Restaurantes (Tenants)", href: "/admin/restaurants", icon: <Building2 className={styles.navItemIcon} /> },
    { label: "Usuarios del Sistema", href: "/admin/users", icon: <Users className={styles.navItemIcon} /> },
  ];

  const restaurantNav = [
    { label: "ZapiDashboard", href: "/dashboard", icon: <LayoutDashboard className={styles.navItemIcon} /> },
    { label: "Ver Tienda Pública", href: `/${user.slug || 'demo-restaurant'}`, icon: <Eye className={styles.navItemIcon} />, external: true },
    { label: "ZapiOrders", href: "/dashboard/orders", icon: <ShoppingBag className={styles.navItemIcon} /> },
    { label: "KDS Modo Cocina", href: "/dashboard/kds", icon: <LayoutDashboard className={styles.navItemIcon} /> },
    { label: "Gestión de Menú", href: "/dashboard/menu", icon: <MenuSquare className={styles.navItemIcon} /> },
    { label: "ZapiQR", href: "/dashboard/tables", icon: <Users className={styles.navItemIcon} /> }, // QR y mesas
    { label: "Marketing", href: "/dashboard/marketing", icon: <Gift className={styles.navItemIcon} /> },
    { label: "Ajustes del Local", href: "/dashboard/settings", icon: <Settings className={styles.navItemIcon} /> },
  ];

  const navItems = user.isSuperadmin ? superadminNav : restaurantNav;

  const pathname = usePathname();

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className={styles.layout}>
      {/* SIDEBAR LATERAL */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Utensils className={styles.brandIcon} />
          <span>ZapiEat</span>
        </div>
        
        <nav className={styles.nav}>
          <div className={styles.navSection}>
            {user.isSuperadmin ? "Superadministrador" : "Restaurante"}
          </div>
          {navItems.map((item, idx) => {
            const isActive = pathname === item.href;
            const external = (item as any).external;
            return (
              <Link
                href={item.href}
                key={idx} 
                target={external ? "_blank" : undefined}
                className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.userProfile}>
          <div className={styles.avatar}>
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.name || "Usuario"}</span>
            <span className={styles.userRole}>{user.role?.toLowerCase() || "Admin"}</span>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className={styles.main}>
        {/* Cabecera superior moderna */}
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>{title}</h1>
          <div className={styles.headerActions} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {!user.isSuperadmin && <PauseContainer />}
            <button onClick={handleLogout} className={styles.logoutBtn}>
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Zona de Widgets dinámicos (que cambian según página) */}
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
