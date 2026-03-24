import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Layers } from "lucide-react";
import styles from "./menu.module.css";
import { AddProductModal } from "./AddProductModal";
import { AddCategoryModal } from "./AddCategoryModal";
import { AddComboModal } from "./AddComboModal";
import { MenuSortableClient } from "./MenuSortableClient";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default async function MenuManagementPage() {
  const session = await auth();
  const restaurantId = session?.user?.restaurantId as string;

  const categories = await prisma.category.findMany({
    where: { restaurantId },
    include: { 
      products: { 
        orderBy: { position: 'asc' },
        include: {
          modifierGroups: {
            orderBy: { position: 'asc' },
            include: {
              modifiers: {
                orderBy: { position: 'asc' }
              }
            }
          }
        }
      } 
    },
    orderBy: { position: 'asc' }
  });

  const allProducts = await prisma.product.findMany({
    where: { restaurantId },
    select: { id: true, name: true }
  });

  const serializedCategories = JSON.parse(JSON.stringify(categories));

  const userInfo = {
    name: session?.user?.name,
    email: session?.user?.email,
    role: session?.user?.role as string,
    isSuperadmin: !!session?.user?.isSuperadmin,
    slug: (session?.user as any)?.restaurantSlug || "demo-restaurant",
  };

  return (
    <DashboardLayout user={userInfo} title="Menu">
      <div className={styles.container}>
        <div className={styles.headerActions}>
          <div className={styles.headerLeft}>
            <p>Organiza tus categorías y productos con arrastrar y soltar</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <AddCategoryModal />
            <AddComboModal categories={serializedCategories.map((c: any) => ({ id: c.id, name: c.name }))} allProducts={allProducts} />
            <AddProductModal categories={serializedCategories.map((c: any) => ({ id: c.id, name: c.name }))} />
          </div>
        </div>

        {serializedCategories.length === 0 ? (
          <div className={styles.emptyState}>
            <Layers size={48} opacity={0.2} />
            <p>Aún no tienes categorías creadas.</p>
            <AddCategoryModal />
          </div>
        ) : (
          <MenuSortableClient 
            initialCategories={serializedCategories} 
            allProducts={allProducts} 
          />
        )}
      </div>
    </DashboardLayout>
  );
}
