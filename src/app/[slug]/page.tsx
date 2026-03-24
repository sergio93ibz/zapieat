import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import styles from "./storefront.module.css";
import { Utensils, Star, Clock, ShoppingCart, Plus, Minus, Search, ShieldCheck, ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { AddToCartBtn, StorefrontCart, RepeatOrders, AllergenIcons } from "./StorefrontClient";
import { StorefrontLayout } from "./StorefrontLayout";
import { getCustomerSession } from "@/lib/customerAuth";
import { StorefrontHeaderActions } from "./StorefrontHeader";
import { StorefrontReviews } from "./StorefrontReviews";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StorefrontPage({ params }: PageProps) {
  const { slug } = await params;

  // Resolve restaurant and its menu
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      categories: {
        where: { isVisible: true },
        include: {
          products: {
            where: { isAvailable: true },
            include: {
              modifierGroups: {
                include: {
                  modifiers: {
                    where: { isAvailable: true },
                    orderBy: { position: "asc" },
                  },
                },
                orderBy: { position: "asc" },
              },
            },
            orderBy: { position: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
      reviews: {
         where: { isVisible: true },
         orderBy: { createdAt: "desc" },
         take: 10
      }
    } as any,
  }) as any;

  if (!restaurant) {
    return notFound();
  }

  // Handle Decimal serialization for Client Components
  const serializedRestaurant = JSON.parse(JSON.stringify(restaurant));

  const customerSession = await getCustomerSession();
  let customerPoints = 0;
  let customerData: { name: string | null; email: string | null; phone: string | null; savedAddresses: any[] | null } | null = null;
  let lastOrders: any[] = [];

  if (customerSession && customerSession.restaurantId === restaurant.id) {
     const cust = await prisma.customer.findUnique({ 
       where: { id: customerSession.customerId },
       include: {
         orders: {
           where: { restaurantId: restaurant.id },
           orderBy: { createdAt: 'desc' },
           take: 2,
           include: {
             items: {
               include: {
                 modifiers: true
               }
             }
           }
         }
       }
     }) as any;

     if (cust) {
       customerPoints = (cust.loyaltyPoints as number) || 0;
       customerData = {
         name: cust.name,
         email: cust.email,
         phone: cust.phone,
         savedAddresses: (cust.savedAddresses as any[] | null) || []
       };
       lastOrders = JSON.parse(JSON.stringify(cust.orders || []));
     }
  }

  // Process Happy Hour and Badges
  // In a real multi-region app, you'd use the restaurant's timezone (Intl.DateTimeFormat)
  const now = new Date();
  const currentDay = now.getDay(); // 0-6 (Sun-Sat)
  const currentTimeStr = now.toLocaleTimeString("es-ES", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

  // Global Restaurant Happy Hour logic
  const isGlobalHappyHourTime = serializedRestaurant.happyHourActive && 
                                serializedRestaurant.happyHourStartTime && 
                                serializedRestaurant.happyHourEndTime && 
                                (serializedRestaurant.happyHourDays || []).includes(currentDay) && 
                                currentTimeStr >= serializedRestaurant.happyHourStartTime && 
                                currentTimeStr <= serializedRestaurant.happyHourEndTime;

  (serializedRestaurant.categories as any[]).forEach((cat: any) => {
    cat.products.forEach((product: any) => {
       if (product.happyHourEnabled && isGlobalHappyHourTime) {
           product.isHappyHourActive = true;
           // Temporarily cast the happy hour as an offer so everything mathematically aligns in the client
           product.originalPriceBeforeHappyHour = product.price;
           product.isOffer = true;
           
           // Apply discount dynamically based on product's individual type and value
           const currentPrice = parseFloat(product.price?.toString() || "0");
           let discountedPrice = currentPrice;
           
           const dhType = product.happyHourDiscountType || "PERCENTAGE";
           const dhValue = parseFloat(product.happyHourDiscount?.toString() || "0");

           if (dhType === "PERCENTAGE") {
             discountedPrice = currentPrice * (1 - (dhValue / 100));
           } else {
             discountedPrice = currentPrice - dhValue;
             if (discountedPrice < 0) discountedPrice = 0;
           }
           
           product.offerPrice = discountedPrice.toFixed(2);
       }
    });
  });

  // Create flat list of all products to use for cross-selling
  const allProducts = (serializedRestaurant.categories as any[]).flatMap((c: any) => c.products);
  const comboProducts = allProducts.filter((p: any) => p.isCombo);

  const reviews = (serializedRestaurant.reviews || []) as any[];
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : "4.8"; // Default fallback if no reviews yet
  const totalReviews = reviews.length > 0 ? reviews.length : "120+";

  return (
    <StorefrontLayout slug={slug}>
      <div className={styles.layout}>
        {/* HEADER */}
        <header className={styles.header}>
          <div className={styles.headerContainer}>
            <div className={styles.brand}>
              <div className={styles.logo}>
                <Utensils size={20} />
              </div>
              <span>{serializedRestaurant.name}</span>
            </div>
            
            <StorefrontHeaderActions 
              restaurantId={serializedRestaurant.id}
              customerId={customerSession?.customerId}
              isLoggedIn={!!(customerSession && customerSession.restaurantId === serializedRestaurant.id)}
              loyaltyPoints={customerPoints}
              loyaltySettings={{
                enabled: serializedRestaurant.enableLoyalty ?? false,
                pointsValue: Number(serializedRestaurant.loyaltyPointsValue || 0),
                minPoints: Number(serializedRestaurant.loyaltyMinPointsToRedeem || 0),
                pointsPerEuro: Number(serializedRestaurant.loyaltyPointsPerEuro || 1)
              }}
            />
          </div>
        </header>

        {/* HERO SECTION */}
        <section className={styles.hero}>
          <div className={styles.heroContainer}>
            <h1 className={styles.restaurantName}>{serializedRestaurant.name}</h1>
            <p className={styles.restaurantDesc}>{serializedRestaurant.description || "Disfruta de la mejor comida a domicilio con ZapiEat."}</p>
            
            <div style={{ display: 'flex', gap: '2rem', color: '#78716c', fontSize: '0.875rem', fontWeight: 600 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Star size={16} fill="#f97316" color="#f97316" />
                  <span style={{ color: '#fafaf9' }}>{avgRating}</span> ({totalReviews} valoraciones)
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Clock size={16} /> 25-35 min
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  Envío gratuito
               </div>
            </div>
          </div>
        </section>

        {/* VIP COMBOS CAROUSEL */}
        {comboProducts.length > 0 && (
          <section style={{ padding: '2rem 5%', background: 'linear-gradient(to right, rgba(249,115,22,0.05), rgba(0,0,0,0))' }}>
             <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fafaf9', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2rem' }}>⚡</span> Combos y Promociones
                </h2>
                <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem', scrollbarWidth: 'none' }}>
                  {comboProducts.map((product: any) => (
                    <div key={product.id} style={{ flex: '0 0 auto', width: '320px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '1rem', overflow: 'hidden', position: 'relative' }}>
                       <AddToCartBtn product={product} showButton={false} className={styles.comboCardBtnWrapper} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                         <div style={{ width: '100%', height: '160px', position: 'relative' }}>
                            <img 
                              src={product.imageUrl || "https://images.unsplash.com/photo-1544025162-811c761e3d64?q=80&w=800"} 
                              alt={product.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', padding: '0.3rem 0.6rem', borderRadius: '2rem', backdropFilter: 'blur(4px)', color: 'white', fontWeight: 800, border: '1px solid rgba(255,255,255,0.2)' }}>
                              VIP
                            </div>
                         </div>
                         <div style={{ padding: '1.2rem' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#fafaf9' }}>{product.name}</h3>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#a8a29e', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               {product.isOffer || product.isHappyHourActive ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                     <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f97316' }}>{Number(product.offerPrice).toFixed(2)}€</span>
                                     <span style={{ fontSize: '0.85rem', color: '#78716c', textDecoration: 'line-through' }}>{Number(product.originalPriceBeforeHappyHour || product.price).toFixed(2)}€</span>
                                  </div>
                               ) : (
                                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f97316' }}>{Number(product.price).toFixed(2)}€</span>
                               )}
                               <div style={{ background: '#f97316', color: 'white', padding: '0.4rem 1rem', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.85rem' }}>Añadir</div>
                            </div>
                         </div>
                       </AddToCartBtn>
                    </div>
                  ))}
                </div>
             </div>
          </section>
        )}

        {/* CATEGORIES BAR */}
        <nav className={styles.categories}>
          <div className={styles.categoriesList}>
            {(serializedRestaurant.categories as any[]).map((cat, idx) => (
              <a key={cat.id} href={`#cat-${cat.id}`} className={`${styles.categoryLink} ${idx === 0 ? styles.activeCategory : ""}`}>
                {cat.name}
              </a>
            ))}
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className={styles.main}>
          <div className={styles.menuContent}>
            {/* LAST ORDERS (Frictionless re-order) */}
            <RepeatOrders orders={lastOrders} />

            {(serializedRestaurant.categories as any[]).map((category) => (
              <section key={category.id} id={`cat-${category.id}`} className={styles.categorySection}>
                <h2 className={styles.categoryTitle}>{category.name}</h2>
                <div className={styles.grid}>
                  {(category.products as any[]).map((product) => (
                    <div key={product.id} className={styles.productCard}>
                      <AddToCartBtn product={product} showButton={false}>
                        <div className={styles.productImage}>
                           <img 
                              src={product.imageUrl ? product.imageUrl : (product.name.toLowerCase().includes('pizza') 
                                ? "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop" 
                                : "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop")} 
                              alt={product.name} 
                            />
                        </div>
                        <div className={styles.productContent}>
                          <div className={styles.productHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <h3 className={styles.productName} style={{ margin: 0 }}>{product.name}</h3>
                              {product.isBestSeller && (
                                <span style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", fontSize: "0.7rem", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.2rem", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                                   🔥 MÁS VENDIDO
                                </span>
                              )}
                              {product.isRecommended && (
                                <span style={{ backgroundColor: "rgba(234, 179, 8, 0.1)", color: "#eab308", fontSize: "0.7rem", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.2rem", border: "1px solid rgba(234, 179, 8, 0.2)" }}>
                                   ⭐ RECOMENDADO
                                </span>
                              )}
                            </div>
                            <div className={styles.priceContainer}>
                              {product.isOffer ? (
                                <>
                                  <span className={styles.oldPrice}>{Number(product.originalPriceBeforeHappyHour || product.price).toFixed(2)}€</span>
                                  <span className={styles.productPrice} style={product.isHappyHourActive ? { color: "#a855f7" } : {}}>
                                     {Number(product.offerPrice).toFixed(2)}€ 
                                     {product.isHappyHourActive && <span style={{ fontSize: "0.6rem", marginLeft: "0.3rem", backgroundColor: "#a855f7", color: "white", padding: "0.1rem 0.3rem", borderRadius: "4px" }}>HAPPY HOUR</span>}
                                  </span>
                                </>
                              ) : (
                                <span className={styles.productPrice}>{Number(product.price).toFixed(2)}€</span>
                              )}
                            </div>
                          </div>
                          <p className={styles.productDesc}>{product.description || "Preparado con ingredientes frescos y de alta calidad."}</p>
                          
                          <div className={styles.productFooter} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginTop: 'auto', 
                            paddingTop: '1.25rem',
                            gap: '1rem',
                            borderTop: '1px solid rgba(255,255,255,0.03)'
                          }}>
                             <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                                <AllergenIcons allergens={product.allergens} />
                             </div>
                             <button className={styles.addBtn}>Añadir</button>
                          </div>
                        </div>
                      </AddToCartBtn>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* CART ASIDE */}
          <aside className={styles.cartColumn}>
            <StorefrontCart 
              restaurantId={serializedRestaurant.id} 
              restaurantSlug={serializedRestaurant.slug} 
              restaurantName={serializedRestaurant.name} 
              crossSellProducts={allProducts}
              isPaused={serializedRestaurant.isPaused || (serializedRestaurant.pausedUntil ? new Date(serializedRestaurant.pausedUntil) > new Date() : false)}
              customer={customerData}
              loyaltySettings={{
                enabled: serializedRestaurant.enableLoyalty,
                pointsValue: Number(serializedRestaurant.loyaltyPointsValue || 0),
                minPoints: Number(serializedRestaurant.loyaltyMinPointsToRedeem || 0)
              }}
            />
          </aside>
        </main>

        {/* REVIEWS SECTION */}
        <StorefrontReviews 
          reviews={reviews} 
          restaurantId={serializedRestaurant.id}
          customerId={customerSession?.customerId}
          customerName={customerData?.name || undefined}
          isLoggedIn={!!(customerSession && customerSession.restaurantId === serializedRestaurant.id)}
        />

        {/* FOOTER */}
        <footer className={styles.footer}>
          <div className={styles.footerContainer}>
            <div className={styles.footerCol}>
              <h4>{serializedRestaurant.name}</h4>
              <p>{serializedRestaurant.description || "Tu comida favorita a domicilio con la mejor calidad y rapidez."}</p>
              <div className={styles.secureBadge}>
                <ShieldCheck size={14} /> Pago Seguro SSL de 256 bits
              </div>
            </div>

            <div className={styles.footerCol}>
              <h4>Legal</h4>
              <ul className={styles.footerLinks}>
                <li><Link href={`/${serializedRestaurant.slug}/info/legal`}>Aviso Legal</Link></li>
                <li><Link href={`/${serializedRestaurant.slug}/info/privacidad`}>Política de Privacidad</Link></li>
                <li><Link href={`/${serializedRestaurant.slug}/info/cookies`}>Política de Cookies</Link></li>
                <li><Link href={`/${serializedRestaurant.slug}/info/terminos`}>Términos y Condiciones</Link></li>
              </ul>
            </div>

            <div className={styles.footerCol}>
              <h4>Soporte</h4>
              <ul className={styles.footerLinks}>
                <li><Link href={`/${serializedRestaurant.slug}/info/contacto`}>Contacto</Link></li>
                <li><Link href={`/${serializedRestaurant.slug}/info/faq`}>Preguntas Frecuentes</Link></li>
                <li><Link href={`/${serializedRestaurant.slug}/info/alergenos`}>Información de Alérgenos</Link></li>
              </ul>
            </div>

            <div className={styles.footerCol}>
              <h4>Pagos seguros</h4>
              <p>Aceptamos las principales tarjetas con total seguridad.</p>
              <div className={styles.paymentBadges}>
                <div className={styles.paymentBadge}>
                  <img src="https://cdn-icons-png.flaticon.com/512/349/349221.png" alt="Visa" />
                </div>
                <div className={styles.paymentBadge}>
                  <img src="https://cdn-icons-png.flaticon.com/512/349/349228.png" alt="Mastercard" />
                </div>
                <div className={styles.paymentBadge}>
                   <img src="https://cdn-icons-png.flaticon.com/512/196/196566.png" alt="PayPal" />
                </div>
                <div className={styles.paymentBadge}>
                  <img src="https://cdn-icons-png.flaticon.com/512/349/349230.png" alt="Amex" />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p>© 2024 {serializedRestaurant.name}. Todos los derechos reservados.</p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Desarrollado con ❤️ por <a href="https://www.sitioswebpro.es" target="_blank" rel="noopener noreferrer" style={{ color: '#f97316', fontWeight: 800, textDecoration: 'none' }}>SitiosWebPRO</a>
            </p>
          </div>
        </footer>
      </div>
    </StorefrontLayout>
  );
}
