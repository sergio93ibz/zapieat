import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import styles from "@/components/dashboard/DashboardLayout.module.css";
import { Store, UserCircle, Tag, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { GeoRevenueWidget } from "@/components/dashboard/GeoRevenueWidget";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(d: Date, days: number) {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export default async function Home(props: { searchParams: Promise<{ range?: string }> }) {
  const searchParams = await props.searchParams;
  // Use "7d" as default to avoid "empty dashboard" feeling if testing data is older
  const range = searchParams?.range || "today";
  const session = await auth();
  
  // Si no hay sesión, le obligamos a iniciar sesión
  if (!session) {
    redirect("/login");
  }

  const userInfo = {
    name: session.user?.name,
    email: session.user?.email,
    role: session.user?.role,
    isSuperadmin: session.user?.isSuperadmin,
    slug: session.user?.restaurantSlug || 'demo-restaurant',
  };

  const restaurantId = session.user?.restaurantId as string;

  // CALCULAR RANGOS DE FECHA
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  switch (range) {
    case "today":
      startDate = startOfUtcDay(now);
      endDate = addUtcDays(startDate, 1);
      break;
    case "yesterday":
      endDate = startOfUtcDay(now);
      startDate = addUtcDays(endDate, -1);
      break;
    case "7d":
      endDate = addUtcDays(startOfUtcDay(now), 1);
      startDate = addUtcDays(endDate, -7);
      break;
    case "30d":
      endDate = addUtcDays(startOfUtcDay(now), 1);
      startDate = addUtcDays(endDate, -30);
      break;
    case "this_month":
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      break;
    case "this_year":
      startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      endDate = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
      break;
    case "all":
      startDate = undefined;
      break;
    default:
      startDate = addUtcDays(startOfUtcDay(now), -7);
      endDate = addUtcDays(startOfUtcDay(now), 1);
  }

  const dateFilter = startDate ? { gte: startDate, ...(endDate ? { lt: endDate } : {}) } : undefined;

  // FETCH REAL STATS
  const stats = userInfo.isSuperadmin ? {
    restaurants: await prisma.restaurant.count(),
    plans: await prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    users: await prisma.user.count(),
    revenue: "1,250" // Placeholder
  } : await (async () => {
    // 1. Número de pedidos filter
    const ordersRangeFilter = dateFilter ? { createdAt: dateFilter } : {};
    
    // Obtener pedidos individuales completados/activos para sacar estadísticas (excluimos cancelados y carritos abandonados)
    const periodOrders = await prisma.order.findMany({
      where: { 
        restaurantId, 
        status: { notIn: ["CANCELLED", "PENDING_PAYMENT"] }, 
        ...ordersRangeFilter 
      },
      select: { total: true, status: true, customerId: true, customerName: true, customerPhone: true, createdAt: true, isDelivery: true, deliveryAddress: true }
    });

    const totalOrders = periodOrders.length;
    // Consideramos todos como "exitosos" (activos/completados) para estas métricas generales, ya excluidos los cancelados
    const completedOrders = totalOrders;
    
    // 2. Ingresos (suma de todos los pedidos activos en el rango)
    const revenueNumber = periodOrders.reduce((sum, o) => sum + Number(o.total), 0);
    
    // 3. Ticket Medio
    const ticketMedio = totalOrders > 0 ? (revenueNumber / totalOrders).toFixed(2) : "0.00";

    // 4. Clientes únicos en ese periodo (aproximación)
    const uniqueIdentifiers = new Set<string>();
    periodOrders.forEach(o => {
      if (o.customerId) uniqueIdentifiers.add(o.customerId);
      else if (o.customerPhone) uniqueIdentifiers.add(o.customerPhone);
      else if (o.customerName) uniqueIdentifiers.add(o.customerName);
    });

    return {
      orders: totalOrders,
      completedOrders,
      revenue: revenueNumber.toFixed(2),
      ticketMedio,
      customers: uniqueIdentifiers.size,
      allOrders: periodOrders, // Pass them cleanly to the client component
       recentOrders: await prisma.order.findMany({
         where: { restaurantId, status: { notIn: ["CANCELLED"] } }, // SIEMPRE muestra los 5 últimos, sin importar la fecha, para dar feedback visual
         orderBy: { createdAt: "desc" },
         take: 5,
         select: { id: true, orderNumber: true, status: true, total: true, customerName: true, createdAt: true, isDelivery: true }
       })
    };
  })();

  return (
    <DashboardLayout 
      user={userInfo} 
      title={userInfo.isSuperadmin ? "ZapiPanel" : "ZapiDashboard"}
    >
      <div style={{ marginBottom: "1rem" }}>
        {/* Selector de Fechas para el Restaurante (Phase 1) */}
        {!userInfo.isSuperadmin && <DateRangeFilter />}
      </div>

      {/* TARJETAS ESTADÍSTICAS */}
      <div className={styles.dashboardGrid}>
        <div className={styles.statCard} style={{ cursor: "pointer", transition: "all 0.2s hover:border-orange-500" }}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>
              {userInfo.isSuperadmin ? "Restaurantes Activos" : "Ingresos Totales"}
            </span>
            <div className={styles.statIcon}><Wallet size={20} /></div>
          </div>
          <div className={styles.statValue}>
            {userInfo.isSuperadmin ? (stats as any).restaurants : `${(stats as any).revenue}€`}
          </div>
          <div className={styles.statTrend} style={{ color: "#a8a29e" }}>
            <span style={{ fontSize: "0.8rem" }}>Sin devoluciones o cancelados</span>
          </div>
          {/* Action Link overlay */}
          {!userInfo.isSuperadmin && (
            <Link href="/dashboard/orders" style={{ position: "absolute", inset: 0 }} title="Ir a Pedidos" />
          )}
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>
              {userInfo.isSuperadmin ? "Planes Activos" : "Pedidos (Realizados)"}
            </span>
            <div className={styles.statIcon}><Store size={20} /></div>
          </div>
          <div className={styles.statValue}>
            {userInfo.isSuperadmin ? (stats as any).plans : (stats as any).orders}
          </div>
          <div className={styles.statTrend}>
            {userInfo.isSuperadmin ? (
              <span className={styles.trendUp}>↑ +1 hoy</span>
            ) : (
              <span style={{ color: "#22c55e", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                <TrendingUp size={14} /> {(stats as any).completedOrders} completados
              </span>
            )}
          </div>
          {/* Action Link */}
          {!userInfo.isSuperadmin && (
            <Link href="/dashboard/orders" style={{ position: "absolute", inset: 0 }} title="Ver Pedidos" />
          )}
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>
              {userInfo.isSuperadmin ? "Cuentas de Usuario" : "Ticket Medio"}
            </span>
            <div className={styles.statIcon}><Tag size={20} /></div>
          </div>
          <div className={styles.statValue}>
            {userInfo.isSuperadmin ? (stats as any).users : `${(stats as any).ticketMedio}€`}
          </div>
          <div className={styles.statTrend}>
            <span style={{ fontSize: "0.8rem", color: "#a8a29e" }}>Valor por cada cesta</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>
              {userInfo.isSuperadmin ? "Plataforma Status" : "Compradores Únicos"}
            </span>
            <div className={styles.statIcon}><UserCircle size={20} /></div>
          </div>
          <div className={styles.statValue}>
            {userInfo.isSuperadmin ? "Online" : (stats as any).customers}
          </div>
          <div className={styles.statTrend}>
            {userInfo.isSuperadmin ? (
              <span className={styles.trendUp}>99.9% SLA</span>
            ) : (
              <span style={{ fontSize: "0.8rem", color: "#a8a29e" }}>Personas distintas en este periodo</span>
            )}
          </div>
        </div>
      </div>

      {/* RECENT ORDERS MINI FEED (Fase 1 / Avance) */}
      {!userInfo.isSuperadmin && (
        <div style={{ marginTop: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Store size={22} color="#f97316" /> Visión General
            </h2>
            <Link href="/dashboard/orders" style={{ 
              background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.4)", 
              color: "#f97316", padding: "0.5rem 1rem", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "bold" 
            }}>
              Ir a la cocina (Tablero Kanban)
            </Link>
          </div>
          <div style={{ 
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", 
            borderRadius: "16px", padding: "1.5rem", display: "grid", gap: "1.5rem" 
          }}>
            <p style={{ color: "#a8a29e", fontSize: "0.95rem", lineHeight: 1.5 }}>
              Usa los filtros de fecha de la parte superior para analizar tus estadísticas. Haz clic en las tarjetas de ingresos o pedidos para ver de dónde provienen en el tablero Kanban. 
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
              
              {/* Recent Orders Table */}
              <div style={{ flex: 2 }}>
                <h3 style={{ fontSize: "1rem", color: "#fafaf9", marginBottom: "1rem", fontWeight: 600 }}>Tus 5 Últimos Pedidos (Recientes)</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#a8a29e" }}>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 500 }}>ID</th>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 500 }}>Cliente</th>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 500 }}>Tipo</th>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 500 }}>Total</th>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 500 }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((stats as any).recentOrders || []).map((ro: any) => (
                        <tr key={ro.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "0.75rem 0.5rem", color: "#d6d3d1" }}>#{ro.orderNumber}</td>
                          <td style={{ padding: "0.75rem 0.5rem" }}>{ro.customerName || "Desconocido"}</td>
                          <td style={{ padding: "0.75rem 0.5rem" }}>
                            {ro.isDelivery ? <span style={{ color: "#38bdf8" }}>Reparto</span> : <span style={{ color: "#a3e635" }}>Recogida</span>}
                          </td>
                          <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>{Number(ro.total).toFixed(2)}€</td>
                          <td style={{ padding: "0.75rem 0.5rem" }}>
                            <span style={{ 
                              background: ro.status === "PENDING" ? "rgba(234,179,8,0.2)" : ro.status === "DELIVERED" || ro.status === "PAID" ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.1)", 
                              color: ro.status === "PENDING" ? "#eab308" : ro.status === "DELIVERED" || ro.status === "PAID" ? "#22c55e" : "#a8a29e", 
                              padding: "0.2rem 0.5rem", 
                              borderRadius: "4px", 
                              fontSize: "0.7rem",
                              fontWeight: "bold"
                            }}>
                              {ro.status === "PENDING" ? "Pendiente" : 
                               ro.status === "ACCEPTED" ? "Aceptado" : 
                               ro.status === "PREPARING" ? "Preparando" : 
                               ro.status === "READY" ? "Listo" : 
                               ro.status === "IN_TRANSIT" ? "En Reparto" : 
                               ro.status === "DELIVERED" ? "Entregado" : 
                               ro.status === "PAID" ? "Pagado" : 
                               ro.status === "CANCELLED" ? "Cancelado" : 
                               ro.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {((stats as any).recentOrders || []).length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: "1rem", textAlign: "center", color: "#78716c" }}>Aún no hay pedidos en tu tienda.</td>
                        </tr>
                      )}
                      </tbody>
                    </table>
                  </div>
                </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', height: "fit-content" }}>
                <div style={{ background: "rgba(249,115,22,0.05)", padding: "1.25rem", borderRadius: 12, border: "1px solid rgba(249,115,22,0.1)" }}>
                  <h3 style={{ fontSize: "0.95rem", color: "#f97316", marginBottom: "0.75rem", fontWeight: 700 }}>💡 Tip de Rentabilidad</h3>
                  <p style={{ fontSize: "0.85rem", color: "#d6d3d1", margin: 0, lineHeight: 1.6 }}>Tu Ticket Medio es de <b>{(stats as any).ticketMedio}€</b>. Si creas <i>Combos</i> estratégicos o sugieres postres en el carrito (Upselling), aumentar este valor un 10% multiplica tus beneficios netos usando el mismo número de pedidos actuales.</p>
                </div>

                {/* Heatmap Widget */}
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "1.25rem", borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
                  <h3 style={{ fontSize: "0.95rem", color: "#fafaf9", display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginBottom: "0.75rem" }}>
                    🗺️ Heatmap: "Tickets de Oro"
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "#a8a29e", margin: '0 0 1rem 0' }}>Repartos más rentables del periodo.</p>
                  <GeoRevenueWidget orders={JSON.parse(JSON.stringify((stats as any).allOrders || []))} />
                </div>
              </div>
            </div>
          </div>

            {/* GRÁFICA DE INGRESOS */}
            <div style={{ marginTop: "2rem" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "16px", padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", color: "#fafaf9", marginBottom: "0.5rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <TrendingUp size={20} color="#22c55e" /> Curva de Ingresos
                </h3>
                <p style={{ color: "#a8a29e", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  Evolución de las ventas (pedidos pagados y entregados) en el periodo analizado.
                </p>
                <RevenueChart 
                  orders={JSON.parse(JSON.stringify((stats as any).allOrders || []))} 
                  range={range} 
                />
              </div>
            </div>
        </div>
      )}

      {userInfo.isSuperadmin && (
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>
             Bienvenido a ZapiPanel
          </h2>
          <p style={{ color: "#a8a29e", lineHeight: "1.6" }}>
            Desde aquí puedes gestionar el sistema completo y monitorizar toda la carga de uso.
          </p>
        </div>
      )}

    </DashboardLayout>
  );
}
