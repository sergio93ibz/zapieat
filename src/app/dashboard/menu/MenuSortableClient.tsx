"use client";

import React, { useEffect, useState } from "react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Layers, Image as ImageIcon } from "lucide-react";
import { reorderCategoriesAction, reorderProductsAction } from "./actions";
import styles from "./menu.module.css";
import { CategoryActions, ProductActions, ProductMoreActions } from "./MenuActionsClient";

// --- PRODUCT ITEM ---
function SortableProductItem({ product, allProducts, categories }: { product: any, allProducts: any[], categories: any[] }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.productCard}>
      <div 
        {...attributes} 
        {...listeners} 
        style={{ 
          position: 'absolute', 
          top: '6px', 
          right: '6px', 
          cursor: 'grab',
          color: 'rgba(255, 255, 255, 0.4)',
          padding: '4px',
          zIndex: 10,
        }}
      >
        <GripVertical size={14} />
      </div>
      
      <div className={styles.productImage}>
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <ImageIcon size={20} style={{ opacity: 0.15 }} />
        )}
      </div>
      
      <div className={styles.productInfo}>
        <div className={styles.productName}>
          <span>
            {product.name}
              {product.isCombo && (
              <span style={{ fontSize: '0.6rem', backgroundColor: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', padding: '1px 4px', borderRadius: '3px', marginLeft: '4px', fontWeight: 700 }}>MENÚ</span>
              )}
          </span>
          <ProductMoreActions 
             product={product} 
             allProducts={allProducts} 
             categories={categories.map((c: any) => ({ id: c.id, name: c.name }))} 
          />
        </div>
        
        <p className={styles.productDescription}>{product.description || "Sin descripción."}</p>
        
        {product.allergens && product.allergens.length > 0 && (
          <div className={styles.allergensList} style={{ marginBottom: '0.5rem' }}>
            {product.allergens.map((a: string) => (
              <span key={a} className={styles.allergenBadge}>{a}</span>
            ))}
          </div>
        )}

        <div className={styles.productFooter}>
          <span className={styles.productPrice}>
             {product.isOffer ? (
               <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                 <span style={{ textDecoration: 'line-through', color: '#525252', fontSize: '0.75rem' }}>
                   {Number(product.price).toFixed(2)}€
                 </span>
                 <span style={{ color: '#fb923c' }}>
                    {Number(product.offerPrice).toFixed(2)}€
                 </span>
               </div>
             ) : (
               `${Number(product.price).toFixed(2)}€`
             )}
          </span>
          <ProductActions 
             productId={product.id} 
             isAvailable={product.isAvailable} 
             productName={product.name}
             modifierGroups={product.modifierGroups || []}
             allProducts={allProducts} 
          />
        </div>
      </div>
    </div>
  );
}

// --- CATEGORY SECTION ---
function SortableCategoryItem({ category, allProducts, categories }: { category: any, allProducts: any[], categories: any[] }) {
  const [products, setProducts] = useState(category.products);

  useEffect(() => {
    setProducts(category.products);
  }, [category.products]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleProductDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
       const oldIndex = products.findIndex((p: any) => p.id === active.id);
       const newIndex = products.findIndex((p: any) => p.id === over.id);
       const newOrder = arrayMove(products, oldIndex, newIndex);
       setProducts(newOrder);
       reorderProductsAction(newOrder.map((p: any) => p.id));
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.categorySection}>
      <div 
        {...attributes} 
        {...listeners} 
        style={{ 
          position: 'absolute', 
          left: '8px', 
          top: '18px', 
          cursor: 'grab',
          color: 'rgba(249, 115, 22, 0.4)',
          padding: '8px',
          zIndex: 5
        }}
      >
        <GripVertical size={20} />
      </div>

      <div className={styles.categoryHeader} style={{ paddingLeft: '3.25rem' }}>
        <div className={styles.categoryTitle}>
          <Layers size={18} color="#fb923c" />
          {category.name}
          <span className={styles.badgeCount}>{products.length} platos</span>
        </div>
        <CategoryActions 
           categoryId={category.id} 
           categoryName={category.name} 
           categoryDescription={category.description} 
        />
      </div>

      {products.length === 0 ? (
        <div style={{ padding: "2.5rem 1.5rem", color: "#525252", fontStyle: "italic", fontSize: "0.85rem", textAlign: 'center' }}>
          No hay productos en esta categoría.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProductDragEnd}>
          <SortableContext items={products.map((p: any) => p.id)} strategy={rectSortingStrategy}>
            <div className={styles.productsGrid}>
              {products.map((product: any) => (
                <SortableProductItem 
                  key={product.id} 
                  product={product} 
                  allProducts={allProducts} 
                  categories={categories}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// --- MAIN CLIENT COMPONENT ---
export function MenuSortableClient({ initialCategories, allProducts }: { initialCategories: any[], allProducts: any[] }) {
  const [categories, setCategories] = useState(initialCategories);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      const newOrder = arrayMove(categories, oldIndex, newIndex);
      setCategories(newOrder);
      reorderCategoriesAction(newOrder.map(c => c.id));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
      <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {categories.map((category) => (
             <SortableCategoryItem 
               key={category.id} 
               category={category} 
               allProducts={allProducts} 
               categories={categories}
             />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
