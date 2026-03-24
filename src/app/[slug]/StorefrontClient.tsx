"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Plus, Minus, X, ShoppingCart, User, LogOut, Package, Clock, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, RotateCcw, ShieldCheck, MapPin } from "lucide-react"
import styles from "./storefront.module.css"
import { useCart } from "./CartContext"
import { v4 as uuidv4 } from "uuid"
import { Portal } from "@/components/ui/Portal"
import { CheckoutModal } from "./CheckoutModal"
import { LocationModal, useLocationChoice, type LocationChoice } from "./LocationModal"

// --- ALLERGEN ICONS ---
const ALLERGEN_MAP: Record<string, string> = {
  "Gluten": "🌾",
  "Lácteos": "🥛",
  "Huevos": "🥚",
  "Pescado": "🐟",
  "Frutos de cáscara": "🌰",
  "Soja": "🌱",
  "Mostaza": "🍯",
  "Sésamo": "🥯",
}

export function AllergenIcons({ allergens }: { allergens?: string[] }) {
  if (!allergens || allergens.length === 0) return null;

  return (
    <div style={{ 
      display: 'inline-flex', 
      gap: '0.4rem',
      flexWrap: 'wrap',
      padding: '0.4rem 0.6rem',
      borderRadius: '8px',
      backgroundColor: 'rgba(255,255,255,0.03)',
      alignItems: 'center'
    }}>
      {allergens.map(a => (
        <span 
          key={a} 
          title={a} 
          style={{ 
            fontSize: '1.2rem', 
            cursor: 'help',
            filter: 'grayscale(1)',
            opacity: 0.5,
            transition: 'all 0.2s ease',
            lineHeight: 1
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'grayscale(0)';
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'grayscale(1)';
            e.currentTarget.style.opacity = '0.5';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {ALLERGEN_MAP[a] || "⚠️"}
        </span>
      ))}
    </div>
  )
}

// --- REPEAT ORDERS ---
export function RepeatOrders({ orders }: { orders: any[] }) {
  const { addItem } = useCart()
  const [addingMessage, setAddingMessage] = useState<string | null>(null)

  if (!orders || orders.length === 0) return null

  const handleRepeatOrder = (order: any) => {
    order.items.forEach((item: any) => {
      const optionsMapped = (item.modifiers || []).map((m: any) => ({
        modifierId: m.modifierId,
        modifierName: m.modifierNameSnapshot,
        price: Number(m.price)
      }))

      addItem({
        id: uuidv4(),
        productId: item.productId,
        name: item.productNameSnapshot,
        price: Number(item.unitPrice) + optionsMapped.reduce((acc: number, o: any) => acc + o.price, 0),
        quantity: item.quantity,
        options: optionsMapped
      })
    })

    setAddingMessage("¡Pedido añadido a la cesta!")
    setTimeout(() => setAddingMessage(null), 3000)
  }

  return (
    <div style={{ marginBottom: '2rem', marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <RotateCcw size={18} color="#f97316" />
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fafaf9', margin: 0 }}>Tus favoritos recientes</h3>
      </div>

      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {orders.map((order, idx) => (
          <div 
            key={order.id} 
            style={{ 
              flex: '0 0 280px', 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.06)', 
              borderRadius: '16px', 
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a8a29e' }}>
              <span>Pedido #{order.orderNumber}</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fafaf9' }}>
              {order.items.map((i: any) => `${i.quantity}x ${i.productNameSnapshot}`).join(", ")}
            </div>

            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontWeight: 700, color: '#f97316' }}>{Number(order.total).toFixed(2)}€</span>
               <button 
                  onClick={() => handleRepeatOrder(order)}
                  style={{ 
                    background: '#f97316', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '8px', 
                    padding: '0.4rem 0.8rem', 
                    fontSize: '0.8rem', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
               >
                 <Plus size={14} strokeWidth={3} /> Repetir
               </button>
            </div>
          </div>
        ))}
      </div>
      
      {addingMessage && (
        <div style={{ 
          marginTop: '0.75rem', 
          backgroundColor: 'rgba(34,197,94,0.1)', 
          color: '#22c55e', 
          padding: '0.5rem 1rem', 
          borderRadius: '8px', 
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.3s'
        }}>
          <ShieldCheck size={16} /> {addingMessage}
        </div>
      )}
    </div>
  )
}

// --- PRODUCT ADD BUTTON / WRAPPER ---
export function AddToCartBtn({ product, children, showButton = true, className, style }: { 
  product: any, 
  children?: React.ReactNode, 
  showButton?: boolean,
  className?: string,
  style?: React.CSSProperties
}) {
  const [showModal, setShowModal] = useState(false)

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowModal(true)
  }

  return (
    <div className={className} onClick={handleAddClick} style={{ cursor: 'pointer', ...style }}>
      {children}
      {showButton && (
        <button className={styles.addBtn} onClick={handleAddClick}>
          Añadir
        </button>
      )}

      {showModal && (
        <ProductDetailModal 
          product={product} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </div>
  )
}

// --- PRODUCT DETAIL MODAL ---
function ProductDetailModal({ product, onClose }: { product: any, onClose: () => void }) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})
  const [currentStep, setCurrentStep] = useState(0)
  
  const isCombo = !!product.isCombo
  const steps = product.modifierGroups || []
  const currentGroup = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const hasMultipleSteps = isCombo && steps.length > 1

  // Initialize selected options for required groups
  useEffect(() => {
    const initial: Record<string, string[]> = {}
    product.modifierGroups?.forEach((group: any) => {
      if (group.required && group.modifiers.length > 0) {
        initial[group.id] = [group.modifiers[0].id]
      }
    })
    setSelectedOptions(initial)
  }, [product])

  const toggleOption = (groupId: string, modifierId: string, isRequired: boolean, max: number) => {
    setSelectedOptions(prev => {
      const current = prev[groupId] || []
      
      if (max === 1) {
        // Radio button behavior
        return { ...prev, [groupId]: [modifierId] }
      } else {
        // Checkbox behavior
        if (current.includes(modifierId)) {
          return { ...prev, [groupId]: current.filter(id => id !== modifierId) }
        } else {
          if (current.length < max) {
             return { ...prev, [groupId]: [...current, modifierId] }
          }
          return prev
        }
      }
    })
  }

  const calculateTotal = () => {
    let extra = 0
    Object.values(selectedOptions).flat().forEach(modId => {
      product.modifierGroups.forEach((g: any) => {
        const mod = g.modifiers.find((m: any) => m.id === modId)
        if (mod) extra += Number(mod.price)
      })
    })
    const basePrice = product.isOffer ? Number(product.offerPrice) : Number(product.price)
    return (basePrice + extra) * quantity
  }

  const handleNextStep = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Validate if current step is required and has selection
    if (currentGroup.required && (!selectedOptions[currentGroup.id] || selectedOptions[currentGroup.id].length < (currentGroup.minSelections || 1))) {
       alert(`Por favor, selecciona una opción para ${currentGroup.name}`)
       return
    }

    if (isLastStep) {
      handleAddToCart()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevStep = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentStep > 0) setCurrentStep(prev => prev - 1)
  }

  const handleAddToCart = () => {
    // Final validation
    const missingRequired = steps.find((g: any) => g.required && (!selectedOptions[g.id] || selectedOptions[g.id].length === 0))
    if (missingRequired) {
      alert(`Por favor, selecciona una opción para ${missingRequired.name}`)
      return
    }

    const optionsList: any[] = []
    Object.entries(selectedOptions).forEach(([groupId, modIds]) => {
      const group = product.modifierGroups.find((g: any) => g.id === groupId)
      if (group) {
        modIds.forEach(mId => {
          const mod = group.modifiers.find((m: any) => m.id === mId)
          if (mod) {
            optionsList.push({
              modifierId: mod.id,
              groupName: group.name,
              modifierName: mod.name,
              price: Number(mod.price)
            })
          }
        })
      }
    })

    const basePrice = product.isOffer ? Number(product.offerPrice) : Number(product.price)
    addItem({
      id: uuidv4(),
      productId: product.id,
      name: product.name,
      price: basePrice + optionsList.reduce((acc, o) => acc + o.price, 0),
      quantity,
      imageUrl: product.imageUrl,
      options: optionsList
    })

    onClose()
  }

  return (
    <Portal>
      <div 
        className={styles.modalOverlay} 
        onClick={(e) => {
          e.stopPropagation()
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className={styles.modal}>
          <div className={styles.modalImage}>
            <img 
              src={product.imageUrl ? product.imageUrl : (product.name.toLowerCase().includes('pizza') 
                ? "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800" 
                : "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800")} 
              alt={product.name} 
            />
            <button className={styles.modalClose} onClick={onClose}><X size={20} /></button>
          </div>

          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalName}>{product.name}</h2>
              <div style={{ marginBottom: '1rem' }}>
                {product.isOffer ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f97316' }}>{Number(product.offerPrice).toFixed(2)}€</span>
                    <span style={{ fontSize: '1rem', color: '#78716c', textDecoration: 'line-through' }}>{Number(product.price).toFixed(2)}€</span>
                    <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#f97316', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>OFERTA</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f97316' }}>{Number(product.price).toFixed(2)}€</span>
                )}
              </div>
              {!hasMultipleSteps && (
                <p className={styles.modalDesc}>{product.description || "Un plato delicioso preparado con los mejores ingredientes."}</p>
              )}
            </div>

            {hasMultipleSteps && (
               <div style={{ display: 'flex', gap: '4px', marginBottom: '2rem' }}>
                  {steps.map((_: any, idx: number) => (
                    <div 
                      key={idx} 
                      style={{ 
                        flex: 1, 
                        height: '4px', 
                        borderRadius: '2px', 
                        backgroundColor: idx <= currentStep ? '#f97316' : 'rgba(255,255,255,0.1)',
                        transition: 'all 0.3s'
                      }} 
                    />
                  ))}
               </div>
            )}

            {hasMultipleSteps ? (
              <div className={styles.optionSection} style={{ animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.50rem', marginBottom: '1.5rem' }}>
                    <span style={{ backgroundColor: '#f97316', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                       {currentStep + 1}
                    </span>
                    <div className={styles.optionTitle} style={{ margin: 0 }}>
                      {currentGroup.name}
                      {currentGroup.required && <span className={styles.requiredBadge}>Obligatorio</span>}
                    </div>
                </div>
                <div className={styles.optionList}>
                  {currentGroup.modifiers.map((mod: any) => {
                    const isSelected = selectedOptions[currentGroup.id]?.includes(mod.id)
                    return (
                      <div 
                        key={mod.id} 
                        className={`${styles.optionItem} ${isSelected ? styles.selected : ""}`}
                        onClick={() => toggleOption(currentGroup.id, mod.id, currentGroup.required, currentGroup.maxSelections)}
                        style={{ padding: '1.25rem' }}
                      >
                        <div className={styles.optionInfo}>
                          <div className={styles.radioCircle}></div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{mod.name}</div>
                          </div>
                        </div>
                        {Number(mod.price) > 0 && (
                          <span className={styles.optionPrice}>+{Number(mod.price).toFixed(2)}€</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              product.modifierGroups?.map((group: any) => (
                <div key={group.id} className={styles.optionSection}>
                  <div className={styles.optionTitle}>
                    {group.name}
                    {group.required && <span className={styles.requiredBadge}>Obligatorio</span>}
                  </div>
                  <div className={styles.optionList}>
                    {group.modifiers.map((mod: any) => {
                      const isSelected = selectedOptions[group.id]?.includes(mod.id)
                      return (
                        <div 
                          key={mod.id} 
                          className={`${styles.optionItem} ${isSelected ? styles.selected : ""}`}
                          onClick={() => toggleOption(group.id, mod.id, group.required, group.maxSelections)}
                        >
                          <div className={styles.optionInfo}>
                            <div className={styles.radioCircle}></div>
                            {mod.name}
                          </div>
                          {Number(mod.price) > 0 && (
                            <span className={styles.optionPrice}>+{Number(mod.price).toFixed(2)}€</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.modalFooter}>
            {hasMultipleSteps ? (
               <div style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'center' }}>
                  {currentStep > 0 && (
                    <button className={styles.qtyBtn} onClick={handlePrevStep} style={{ width: '54px' }}>
                      <ArrowLeft size={20} />
                    </button>
                  )}
                  <button className={styles.addToCartBtn} onClick={handleNextStep} style={{ flex: 1, justifyContent: 'space-between' }}>
                    <span>
                       {isLastStep ? "Finalizar y Añadir" : "Siguiente Paso"}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{calculateTotal().toFixed(2)}€</span>
                       <ArrowRight size={18} />
                    </div>
                  </button>
               </div>
            ) : (
              <>
                <div className={styles.quantityControl}>
                  <button className={styles.qtyBtn} onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity === 1}>
                    <Minus size={20} />
                  </button>
                  <span className={styles.qtyValue}>{quantity}</span>
                  <button className={styles.qtyBtn} onClick={() => setQuantity(q => q + 1)}>
                    <Plus size={20} />
                  </button>
                </div>

                <button className={styles.addToCartBtn} onClick={handleAddToCart}>
                  <span>Añadir al pedido</span>
                  <span>{calculateTotal().toFixed(2)}€</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}

// --- CART SIDEBAR ---
export function StorefrontCart({ restaurantId, restaurantSlug, restaurantName, crossSellProducts, isPaused, customer, loyaltySettings }: {
  restaurantId: string
  restaurantSlug: string
  restaurantName: string
  crossSellProducts?: any[]
  isPaused?: boolean
  customer?: {
    name?: string | null
    email?: string | null
    phone?: string | null
    savedAddresses?: any[] | null
  } | null
  loyaltySettings?: {
    enabled: boolean
    pointsValue: number
    minPoints: number
  }
}) {
  const { items, total, removeItem, updateQuantity } = useCart()
  const [showCheckout, setShowCheckout] = useState(false)
  const [showUpsell, setShowUpsell] = useState(false)
  const [availableUpsells, setAvailableUpsells] = useState<any[]>([])
  const { choice, showModal, setChoice, resetChoice } = useLocationChoice(restaurantSlug)

  const isDelivery = choice?.type === "delivery"
  const minOrder = isDelivery ? (choice?.minOrder ?? 0) : 0
  const belowMinimum = isDelivery && minOrder > 0 && total < minOrder
  const baseDeliveryFee = isDelivery ? (choice?.deliveryFee ?? 0) : 0
  const underMinFee = isDelivery ? (choice?.underMinFee ?? 0) : 0
  const allowUnderMinOrder = isDelivery ? (choice?.allowUnderMinOrder ?? false) : false
  const hardBlock = belowMinimum && !allowUnderMinOrder
  const softWarn = belowMinimum && allowUnderMinOrder
  
  // If minOrder > 0 and we are NOT below minimum, delivery base fee applies (can be 0 if FREE delivery over minOrder).
  // If below minimum and it's a soft warning (we allow it), the user pays base fee + underMinFee (or just underMinFee if it replaces it? Let's treat it as a replacement "Tarifa especial").
  const deliveryFee = softWarn ? underMinFee : ((minOrder > 0 && !belowMinimum) ? 0 : baseDeliveryFee)
  
  const missing = minOrder > 0 ? Math.max(0, minOrder - total) : 0

  const handleGoToCheckout = () => {
    if (hardBlock) return;
    
    // Cross-selling logic
    const validCrossSells = (crossSellProducts || []).filter(p => {
      if (!p.isCrossSell) return false;
      const inCart = items.some(i => i.id === p.id)
      const requiresModifiers = p.modifierGroups?.some((g: any) => g.required)
      return !inCart && !requiresModifiers
    });
    
    const upsells = validCrossSells.sort((a, b) => Number(a.price) - Number(b.price)).slice(0, 3);
    
    if (upsells.length > 0) {
      setAvailableUpsells(upsells)
      setShowUpsell(true)
    } else {
      setShowCheckout(true)
    }
  }

  return (
    <>
      {/* Location / delivery modal on first visit */}
      {showModal && (
        <LocationModal
          restaurantSlug={restaurantSlug}
          restaurantName={restaurantName}
          onConfirm={setChoice}
        />
      )}

      <div className={styles.cartSidebar}>
        <div className={styles.cartHeader}>
          <ShoppingCart size={20} color="#f97316" />
          Tu Pedido
        </div>

        {/* Delivery / pickup indicator */}
        {choice && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.5rem 0.6rem", marginBottom: "0.5rem",
            background: choice.type === "delivery" ? "rgba(34,197,94,0.06)" : "rgba(249,115,22,0.06)",
            border: `1px solid ${choice.type === "delivery" ? "rgba(34,197,94,0.15)" : "rgba(249,115,22,0.15)"}`,
            borderRadius: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}>
              <MapPin size={13} color={choice.type === "delivery" ? "#22c55e" : "#f97316"} />
              <span style={{ color: choice.type === "delivery" ? "#22c55e" : "#f97316", fontWeight: 600 }}>
                {choice.type === "delivery"
                  ? `Reparto${choice.postalCode ? ` · ${choice.postalCode}` : ""}${choice.deliveryFee === 0 ? " · Gratis" : choice.deliveryFee ? ` · ${choice.deliveryFee.toFixed(2)}€` : ""}`
                  : "Recogida en local"}
              </span>
            </div>
            <button
              onClick={resetChoice}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#78716c", padding: 2, display: "flex" }}
              title="Cambiar"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className={styles.emptyCart}>
            <ShoppingCart size={40} className={styles.emptyCartIcon} />
            <p>Tu cesta está vacía</p>
            <span style={{ fontSize: '0.75rem', color: '#57534e' }}>Selecciona algo delicioso para empezar</span>
          </div>
        ) : (
          <div className={styles.cartItems} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '400px', paddingRight: '0.5rem' }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.1rem' }}>{item.name}</span>
                    {item.options.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#a8a29e' }}>
                        {item.options.map((o, idx) => (
                          <div key={idx}>+ {o.modifierName}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span style={{ fontWeight: 700, color: '#f97316', fontSize: '0.9rem' }}>{(item.price * item.quantity).toFixed(2)}€</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
                    <button 
                      onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeItem(item.id)}
                      style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '3px' }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '1.2rem', textAlign: 'center' }}>{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '3px' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className={styles.cartFooter}>
            {/* Subtotal + delivery fee row */}
            {isDelivery && deliveryFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#a8a29e' }}>
                <span>Subtotal</span>
                <span>{total.toFixed(2)}€</span>
              </div>
            )}
            {isDelivery && deliveryFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#a8a29e' }}>
                <span>Gasto de envío</span>
                <span>{deliveryFee.toFixed(2)}€</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: 700, fontSize: '1rem' }}>
               <span>Total</span>
               <span style={{ color: '#f97316' }}>{(total + (isDelivery ? deliveryFee : 0)).toFixed(2)}€</span>
            </div>

            {/* Minimum order warnings */}
            {hardBlock && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 12,
                padding: '0.75rem',
                marginBottom: '0.75rem',
              }}>
                <div style={{ fontWeight: 700, color: '#fca5a5', fontSize: '0.825rem', marginBottom: 4 }}>
                  🛒 Pedido mínimo: {minOrder.toFixed(2)}€
                </div>
                <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>
                  Te faltan <b>{missing.toFixed(2)}€</b> para llegar al mínimo de reparto.
                  Añade más productos para continuar.
                </div>
                {/* Progress bar */}
                <div style={{ marginTop: '0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((total / minOrder) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, #f97316, #ef4444)',
                    borderRadius: 99,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#78716c', marginTop: 4 }}>
                  <span>{total.toFixed(2)}€</span>
                  <span>{minOrder.toFixed(2)}€</span>
                </div>
              </div>
            )}

            {softWarn && (
              <div style={{
                background: 'rgba(234,179,8,0.06)',
                border: '1px solid rgba(234,179,8,0.2)',
                borderRadius: 12,
                padding: '0.75rem',
                marginBottom: '0.75rem',
              }}>
                <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.825rem', marginBottom: 4 }}>
                  ⚠️ Por debajo del pedido mínimo ({minOrder.toFixed(2)}€)
                </div>
                <div style={{ color: '#fde68a', fontSize: '0.8rem' }}>
                  Se aplicará el gasto de envío de <b>{deliveryFee.toFixed(2)}€</b>.
                  Añade <b>{missing.toFixed(2)}€</b> más y el envío será gratis.
                </div>
                {/* Progress bar */}
                <div style={{ marginTop: '0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((total / minOrder) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    borderRadius: 99,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#78716c', marginTop: 4 }}>
                  <span>{total.toFixed(2)}€</span>
                  <span>{minOrder.toFixed(2)}€ (mín. envío gratis)</span>
                </div>
              </div>
            )}
            <div className={styles.cartActions}>
          {isPaused ? (
            <button className={styles.checkoutBtn} style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#333' }} disabled>
              Cocina Pausada 🚧
            </button>
          ) : (
            <button 
              className={styles.checkoutBtn} 
              onClick={handleGoToCheckout}
              disabled={hardBlock}
              style={hardBlock ? { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(0.5)' } : {}}
            >
              {hardBlock
                ? `Añade ${missing.toFixed(2)}€ más`
                : 'Tramitar Pedido'
              }
            </button>
            )}
          </div>
        </div>
        )}
      </div>

      {showUpsell && (
        <UpsellModal 
          crossSells={availableUpsells} 
          onContinue={() => {
            setShowUpsell(false)
            setShowCheckout(true)
          }}
          onSkip={() => {
            setShowUpsell(false)
            setShowCheckout(true)
          }}
        />
      )}

      {showCheckout && (
        <CheckoutModal
          restaurantId={restaurantId}
          restaurantSlug={restaurantSlug}
          locationChoice={choice}
          onClose={() => setShowCheckout(false)}
          customer={customer}
          loyaltySettings={loyaltySettings}
        />
      )}
    </>
  )
}

function UpsellModal({ crossSells, onContinue, onSkip }: { crossSells: any[], onContinue: () => void, onSkip: () => void }) {
  const { addItem } = useCart()

  return (
    <Portal>
      <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onSkip()}>
        <div className={styles.modal} style={{ maxWidth: '500px', width: '90%', padding: 0 }}>
          <div className={styles.modalHeader} style={{ borderBottom: 'none', paddingBottom: 0, justifyContent: 'flex-end', padding: '1rem' }}>
             <button className={styles.modalClose} onClick={onSkip} style={{ background: 'transparent', border: 'none', color: '#a8a29e', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          <div style={{ textAlign: "center", padding: "0 2rem" }}>
             <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>👀</div>
             <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#fafaf9" }}>¡Espera un segundo!</h2>
             <p style={{ color: "#a8a29e", marginTop: "0.5rem", fontSize: "0.95rem", lineHeight: 1.5 }}>
               ¿No te apetece acompañarlo con algo más antes de terminar tu pedido?
             </p>
          </div>
          
          <div style={{ padding: "1.5rem", display: "flex", gap: "1rem", overflowX: "auto" }}>
            {crossSells.map(p => (
              <div key={p.id} style={{ flex: '0 0 auto', width: '160px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', transform: 'scale(1)', transition: 'transform 0.2s', cursor: 'default' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fafaf9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ color: '#f97316', fontSize: '0.9rem', fontWeight: 700 }}>+{Number(p.price).toFixed(2)}€</div>
                <button
                  type="button"
                  onClick={() => {
                    addItem({ id: uuidv4(), productId: p.id, name: p.name, price: Number(p.price), quantity: 1, options: [] })
                    onContinue()
                  }}
                  style={{ marginTop: 'auto', background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '8px', padding: '0.6rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}
                >
                  ¡Añadirlo!
                </button>
              </div>
            ))}
          </div>

          <div style={{ padding: "1rem 1.5rem 1.5rem", display: "flex", justifyContent: "center" }}>
             <button onClick={onSkip} style={{ background: "transparent", border: "none", color: "#78716c", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", textDecoration: 'underline' }}>
               No gracias, ir directamente a pagar
             </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
