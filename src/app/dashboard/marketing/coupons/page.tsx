import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import styles from "../marketing.module.css";
import { CouponFormModal } from "./CouponFormModal";
import { CouponTableActions } from "./CouponTableActions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function CouponsPage() {
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

  // Fetch coupons
  const coupons = await (prisma as any).coupon.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    include: {
      product: true,
    }
  });

  // Fetch products for "Free Product" dropdown
  const productsResult = await prisma.product.findMany({
    where: { restaurantId },
    select: { id: true, name: true, price: true }
  });
  const products = productsResult.map((p: any) => ({ ...p, price: Number(p.price) }));

  return (
    <DashboardLayout user={userInfo} title="Cupones de Descuento">
      <div className={styles.container}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/dashboard/marketing" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#a8a29e", textDecoration: "none", fontSize: "0.875rem" }}>
             <ArrowLeft size={16} /> Volver a Marketing
          </Link>
          <CouponFormModal products={products} />
        </div>

        {coupons.length === 0 ? (
          <div style={{ backgroundColor: "#1c1917", padding: "3rem", borderRadius: "1rem", textAlign: "center", color: "#a8a29e", border: "1px dashed #444" }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>🎟️</span>
            <p>Aún no tienes ningún cupón de descuento creado.</p>
          </div>
        ) : (
          <div style={{ backgroundColor: "#1c1917", borderRadius: "1rem", overflow: "hidden", border: "1px solid #292524" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ backgroundColor: "#0c0a09" }}>
                <tr>
                  <th style={{ padding: "1rem", color: "#fafaf9", fontWeight: 600, borderBottom: "1px solid #292524" }}>Código</th>
                  <th style={{ padding: "1rem", color: "#fafaf9", fontWeight: 600, borderBottom: "1px solid #292524" }}>Descuento</th>
                  <th style={{ padding: "1rem", color: "#fafaf9", fontWeight: 600, borderBottom: "1px solid #292524" }}>Condiciones</th>
                  <th style={{ padding: "1rem", color: "#fafaf9", fontWeight: 600, borderBottom: "1px solid #292524" }}>Usos</th>
                  <th style={{ padding: "1rem", color: "#fafaf9", fontWeight: 600, borderBottom: "1px solid #292524" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon: any) => (
                  <tr key={coupon.id} style={{ borderBottom: "1px solid #292524" }}>
                    <td style={{ padding: "1rem" }}>
                      <span style={{ backgroundColor: "rgba(249,115,22,0.1)", color: "#f97316", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontWeight: "bold", letterSpacing: "1px" }}>
                        {coupon.code}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", color: "#e7e5e4" }}>
                      {coupon.discountType === "PERCENTAGE" && `-${coupon.discountValue}%`}
                      {coupon.discountType === "FIXED_AMOUNT" && `-${coupon.discountValue}€`}
                      {coupon.discountType === "FREE_PRODUCT" && `Regalo: ${coupon.product?.name}`}
                    </td>
                    <td style={{ padding: "1rem", color: "#a8a29e", fontSize: "0.85rem" }}>
                      {coupon.minOrderAmount ? `Compra Mín.: ${coupon.minOrderAmount}€` : "Sin pedido mínimo"}
                      <br/>
                      {coupon.expiresAt ? `Caduca: ${new Date(coupon.expiresAt).toLocaleDateString()}` : "No caduca"}
                    </td>
                    <td style={{ padding: "1rem", color: "#a8a29e", fontSize: "0.85rem" }}>
                      {coupon.usesCount} / {coupon.maxUses || "∞"}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <CouponTableActions coupon={coupon} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
