"use client";

import React, { useState, useRef } from "react";
import { 
  ShoppingCart, 
  Utensils, 
  ChevronRight, 
  Plus, 
  Minus, 
  Search, 
  MessageSquare,
  ArrowRight,
  ChevronLeft
} from "lucide-react";
import styles from "./kiosk.module.css";
import { RepeatOrders, AllergenIcons } from "../../StorefrontClient";
import { useCart } from "../../CartContext";
import { AddToCartBtn } from "../../StorefrontClient";
import { Portal } from "@/components/ui/Portal";
import { CheckoutModal } from "../../CheckoutModal";

interface KioskStorefrontProps {
  restaurant: any;
  table: any;
  lastOrders?: any[];
}

export function KioskStorefront({ restaurant, table, lastOrders = [] }: KioskStorefrontProps) {
  const { items, total, updateQuantity, removeItem } = useCart();
  const [activeCategory, setActiveCategory] = useState(restaurant.categories[0]?.id);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  const scrollToCategory = (id: string) => {
    categoryRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveCategory(id);
  };

  const filteredCategories = (restaurant.categories || []).map((cat: any) => ({
    ...cat,
    products: (cat.products || []).filter((p: any) => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter((cat: any) => cat.products.length > 0);

  const totalItems = items.reduce((acc: number, i: any) => acc + i.quantity, 0);

  return (
    <div className={styles.kioskContainer}>
      <header className={styles.header}>
        <div className={styles.restaurantInfo}>
          <div className={styles.brandLogo}>
            <Utensils size={24} />
          </div>
          <div className={styles.nameAndTable}>
            <h1 className={styles.restaurantName}>{restaurant.name}</h1>
            <div className={styles.tableBadge}>
              <span className={styles.pulse}></span>
              Mesa {table.name}
            </div>
          </div>
        </div>
        
        <div className={styles.searchBar}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="¿Qué te apetece hoy?" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </header>

      <nav className={styles.categoryNav}>
        <div className={styles.navInner}>
          {restaurant.categories?.map((cat: any) => (
            <button
              key={cat.id}
              className={`${styles.navItem} ${activeCategory === cat.id ? styles.activeNav : ""}`}
              onClick={() => scrollToCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </nav>

      <main className={styles.content}>
        {/* REPEAT FAVORITES */}
        <RepeatOrders orders={lastOrders} />

        {filteredCategories.map((category: any) => (
          <section 
            key={category.id} 
            className={styles.section}
            ref={el => { categoryRefs.current[category.id] = el }}
          >
            <h2 className={styles.sectionTitle}>{category.name}</h2>
            <div className={styles.grid}>
              {category.products.map((product: any) => (
                <div 
                  key={product.id} 
                  className={styles.productCard}
                >
                  <AddToCartBtn product={product} showButton={false}>
                    <div className={styles.productImage}>
                      <img 
                         src={product.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800"} 
                         alt={product.name} 
                      />
                      {product.isOffer && <span className={styles.offerBadge}>OFERTA</span>}
                    </div>
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{product.name}</h3>
                      <p className={styles.productDesc}>{product.description}</p>
                        <div className={styles.productFooter} style={{ gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '1rem' }}>
                          <div className={styles.priceTag}>
                            {product.isOffer ? (
                              <>
                                <span className={styles.originalPrice}>{Number(product.price).toFixed(2)}€</span>
                                <span className={styles.currPrice}>{Number(product.offerPrice).toFixed(2)}€</span>
                              </>
                            ) : (
                              <span className={styles.currPrice}>{Number(product.price).toFixed(2)}€</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
                            <AllergenIcons allergens={product.allergens} />
                            <button className={styles.addBtn} style={{ position: 'relative', zIndex: 0 }}>Añadir</button>
                          </div>
                        </div>
                    </div>
                  </AddToCartBtn>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {items.length > 0 && (
        <div className={styles.floatingCart} onClick={() => setShowCart(true)}>
          <div className={styles.cartIconContainer}>
            <ShoppingCart size={24} />
            <span className={styles.cartBadge}>{totalItems}</span>
          </div>
          <div className={styles.cartText}>
            <span className={styles.cartTitle}>Ver mi pedido</span>
            <span className={styles.cartTotal}>{total.toFixed(2)}€</span>
          </div>
          <ChevronRight size={20} />
        </div>
      )}

      <button className={styles.callButton} onClick={() => alert("Un camarero acudirá a la Mesa " + table.name + " en un momento.")}>
        <MessageSquare size={24} />
      </button>

      {showCart && (
        <Portal>
          <div className={styles.cartOverlay} onClick={() => setShowCart(false)}>
            <div className={styles.cartSheet} onClick={e => e.stopPropagation()}>
               <div className={styles.cartHeader}>
                  <button className={styles.closeCart} onClick={() => setShowCart(false)}>
                    <ChevronLeft size={24} />
                  </button>
                  <h2 className={styles.cartHeaderTitle}>Mi Pedido - Mesa {table.name}</h2>
               </div>
               
               <div className={styles.cartItemsList}>
                 {items.map((item: any) => (
                   <div key={item.id} className={styles.cartItemRecord}>
                      <div className={styles.cartItemMain}>
                        <div className={styles.cartItemImg}>
                           <img src={item.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800"} alt={item.name} />
                        </div>
                        <div className={styles.cartItemData}>
                           <h4>{item.name}</h4>
                           {item.options?.length > 0 && (
                             <p>{item.options.map((o: any) => o.modifierName).join(", ")}</p>
                           )}
                           <span className={styles.cartItemPrice}>{(item.price * item.quantity).toFixed(2)}€</span>
                        </div>
                      </div>
                      <div className={styles.cartItemActions}>
                         <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeItem(item.id)}>
                           <Minus size={18} />
                         </button>
                         <span>{item.quantity}</span>
                         <button onClick={() => updateQuantity(item.id, 1)}>
                           <Plus size={18} />
                         </button>
                      </div>
                   </div>
                 ))}
               </div>

               <div className={styles.cartSheetFooter}>
                  <div className={styles.footerPriceInfo}>
                     <span>Total acumulado</span>
                     <strong>{total.toFixed(2)}€</strong>
                  </div>
                  <button 
                    className={styles.confirmOrderBtn} 
                    onClick={() => {
                        setShowCart(false);
                        setShowCheckout(true);
                    }}
                  >
                    Confirmar Pedido <ArrowRight size={20} />
                  </button>
               </div>
            </div>
          </div>
        </Portal>
      )}

      {showCheckout && (
        <CheckoutModal 
           restaurantId={restaurant.id}
           restaurantSlug={restaurant.slug}
           locationChoice={{ type: 'pickup', isTable: true, tableId: table.id, tableName: table.name }}
           onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}
