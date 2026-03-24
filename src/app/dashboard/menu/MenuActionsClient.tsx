"use client"

import React, { useTransition } from "react"
import { deleteProductAction, toggleProductAvailabilityAction, deleteCategoryAction } from "./actions"
import { ModifiersModal } from "./ModifiersModal"
import { EditProductModal } from "./EditProductModal"
import { EditComboModal } from "./EditComboModal"
import { EditCategoryModal } from "./EditCategoryModal"
import { Portal } from "@/components/ui/Portal"
import { MoreHorizontal, Edit2, Tag, Trash2, Settings2, X } from "lucide-react"
import styles from "./menu.module.css"

export function ProductActions({ 
  productId, 
  isAvailable, 
  productName, 
  modifierGroups,
  allProducts 
}: { 
  productId: string, 
  isAvailable: boolean, 
  productName: string, 
  modifierGroups: any[],
  allProducts: any[] 
}) {
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(() => {
      toggleProductAvailabilityAction(productId, isAvailable)
    })
  }

  const handleDelete = () => {
    if (confirm("¿Seguro que quieres borrar este producto?")) {
      startTransition(() => {
        deleteProductAction(productId)
      })
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <div 
        className={styles.statusToggle} 
        onClick={handleToggle}
        style={{ opacity: isPending ? 0.5 : 1 }}
      >
        <div className={`${styles.toggleSwitch} ${isAvailable ? styles.active : ""}`}>
          <div className={styles.toggleKnob}></div>
        </div>
        {isAvailable ? "Disponible" : "Agotado"}
      </div>
      
      <ProductModifiersAction 
        productId={productId} 
        productName={productName} 
        groups={modifierGroups} 
        allProducts={allProducts}
      />
      
      <button 
        onClick={handleDelete}
        disabled={isPending}
        style={{ 
          background: "transparent", 
          border: "none", 
          color: "#ef4444", 
          cursor: "pointer", 
          padding: "4px",
          display: "flex",
          opacity: isPending ? 0.5 : 1
        }}
        title="Eliminar producto"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

export function CategoryActions({ categoryId, categoryName, categoryDescription }: { categoryId: string, categoryName: string, categoryDescription?: string | null }) {
  const [isPending, startTransition] = useTransition()
  const [isEditOpen, setIsEditOpen] = React.useState(false)

  const handleDelete = () => {
    if (confirm("¿Seguro que quieres borrar esta categoría y TODOS sus productos?")) {
      startTransition(() => {
        deleteCategoryAction(categoryId)
      })
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.6rem" }}>
      <button 
        onClick={() => setIsEditOpen(true)}
        style={{ 
          backgroundColor: "rgba(255, 255, 255, 0.05)", 
          border: "1px solid rgba(255,255,255,0.08)", 
          color: "#ffffff", 
          padding: "0.4rem",
          borderRadius: "0.6rem",
          cursor: "pointer",
          display: "flex",
          transition: "all 0.2s",
          opacity: isPending ? 0.5 : 1
        }}
        title="Editar categoría"
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
      >
        <Edit2 size={16} />
      </button>

      <button 
        onClick={handleDelete}
        disabled={isPending}
        style={{ 
          backgroundColor: "rgba(239, 68, 68, 0.1)", 
          border: "1px solid rgba(239, 68, 68, 0.2)", 
          color: "#ef4444", 
          padding: "0.4rem",
          borderRadius: "0.6rem",
          cursor: "pointer",
          display: "flex",
          transition: "all 0.2s",
          opacity: isPending ? 0.5 : 1
        }}
        title="Eliminar categoría"
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
      >
        <Trash2 size={16} />
      </button>

      {isEditOpen && (
        <EditCategoryModal 
          category={{ id: categoryId, name: categoryName, description: categoryDescription }} 
          onClose={() => setIsEditOpen(false)} 
        />
      )}
    </div>
  )
}

export function ProductModifiersAction({ 
  productId, 
  productName, 
  groups,
  allProducts 
}: { 
  productId: string, 
  productName: string, 
  groups: any[],
  allProducts: any[] 
}) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{ 
          background: "transparent", 
          border: "none", 
          color: "#f97316", 
          cursor: "pointer", 
          padding: "4px",
          display: "flex"
        }}
        title="Opciones y Modificadores"
      >
        <Settings2 size={18} />
      </button>

      {isOpen && (
        <ModifiersModal 
          productId={productId} 
          productName={productName} 
          groups={groups} 
          allProducts={allProducts}
          onClose={() => setIsOpen(false)} 
        />
      )}
    </>
  )
}

export function ProductMoreActions({ 
  product, 
  categories,
  allProducts 
}: { 
  product: any, 
  categories: any[],
  allProducts: any[] 
}) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (confirm("¿Seguro que quieres borrar este producto?")) {
      startTransition(() => {
        deleteProductAction(product.id)
      })
    }
    setIsDropdownOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        style={{ background: "transparent", border: "none", color: "#78716c", cursor: "pointer", display: 'flex' }}
      >
        <MoreHorizontal size={18} />
      </button>

      {isDropdownOpen && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
            onClick={() => setIsDropdownOpen(false)} 
          />
          <div style={{ 
            position: 'absolute', 
            top: '100%', 
            right: 0, 
            backgroundColor: '#1c1917', 
            border: '1px solid rgba(255,255,255,0.05)', 
            borderRadius: '0.75rem', 
            padding: '0.5rem', 
            zIndex: 1000, 
            minWidth: '160px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
          }}>
            <button 
              onClick={() => { setIsEditOpen(true); setIsDropdownOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', color: '#fafaf9', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '0.5rem' }}
              className={styles.dropdownItem}
            >
              <Edit2 size={14} /> {product.isCombo ? "Editar menú" : "Editar producto"}
            </button>
            
            <button 
              onClick={() => { setIsEditOpen(true); setIsDropdownOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', color: '#f97316', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '0.5rem' }}
              className={styles.dropdownItem}
            >
              <Tag size={14} /> Aplicar oferta
            </button>

            <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '0.4rem 0' }} />

            <button 
              onClick={handleDelete}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '0.5rem' }}
              className={styles.dropdownItem}
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </>
      )}

      {isEditOpen && (
        product.isCombo ? (
          <EditComboModal
            product={product}
            categories={categories}
            allProducts={allProducts}
            onClose={() => setIsEditOpen(false)}
          />
        ) : (
          <EditProductModal 
            product={product} 
            categories={categories} 
            allProducts={allProducts}
            onClose={() => setIsEditOpen(false)} 
          />
        )
      )}
    </div>
  )
}
