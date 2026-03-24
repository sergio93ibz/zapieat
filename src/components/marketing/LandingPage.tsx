"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, QrCode, Smartphone, 
  ChefHat, CreditCard, ChevronRight, 
  CheckCircle2, Store, LineChart, 
  Clock, Euro, ShieldCheck, Play
} from "lucide-react";
import styles from "./landing.module.css";
import { OnboardingModal } from "./OnboardingModal";

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={styles.page}>
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      {/* HEADER */}
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <span className={styles.logoText}>ZapiEat</span>
          </div>
          <nav className={styles.nav}>
            <Link href="#como-funciona" className={styles.navLink}>Cómo funciona</Link>
            <Link href="#funcionalidades" className={styles.navLink}>Beneficios</Link>
            <Link href="#precios" className={styles.navLink}>Precios</Link>
          </nav>
          <div className={styles.headerActions}>
            <Link href="/login" className={styles.loginBtn}>Iniciar Sesión</Link>
            <button onClick={() => setShowOnboarding(true)} className={styles.ctaBtn}>Pruébalo Gratis</button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className={styles.hero}>
          <div className={styles.heroGlow}></div>
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div className={styles.heroContent}>
                <div className={styles.badge}>
                  <span className={styles.badgeHighlight}>Nuevo</span>
                  El sistema definitivo para restaurantes
                </div>
                <h1 className={styles.heroTitle}>
                   Digitaliza tu restaurante, <br/>
                   <span className={styles.textGradient}>elimina comisiones</span> <br/>
                   y aumenta tus ingresos.
                </h1>
                <p className={styles.heroSubtitle}>
                  La alternativa rentable a Glovo y JustEat. Pedidos en mesa, delivery, 
                  pagos integrados y control total con 0% de comisiones por pedido.
                </p>
                <div className={styles.heroButtons}>
                  <button onClick={() => setShowOnboarding(true)} className={styles.primaryBtnLg}>
                    Empezar Gratis <ArrowRight size={20} />
                  </button>
                  <Link href="#como-funciona" className={styles.secondaryBtnLg}>
                    Ver cómo funciona <Play size={20} />
                  </Link>
                </div>
                <div className={styles.heroTrust}>
                  <div className={styles.avatars}>
                    <div className={styles.avatar} style={{ backgroundColor: '#10b981' }}></div>
                    <div className={styles.avatar} style={{ backgroundColor: '#3b82f6' }}></div>
                    <div className={styles.avatar} style={{ backgroundColor: '#f59e0b' }}></div>
                  </div>
                  <div className={styles.trustText}>
                    <span>Más de <strong>500+ restaurantes</strong></span>
                    <span>ya no pagan comisiones abusivas</span>
                  </div>
                </div>
              </div>

              <div className={styles.heroImageContainer}>
                <div className={styles.bentoGrid}>
                   <div className={styles.bentoCard} style={{ gridArea: 'main', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div className={styles.mockupHeader} style={{ padding: '1rem 1rem 0', marginBottom: '0.5rem' }}>
                        <div className={styles.mockupDots}>
                          <span></span><span></span><span></span>
                        </div>
                        <span className={styles.mockupTitle}>Zapi KDS Pro</span>
                      </div>
                      <div className={styles.mockupBody} style={{ padding: '0', flex: 1, position: 'relative' }}>
                         {/* REAL SCREENSHOT PLACEHOLDER */}
                         <img 
                           src="/images/kds-preview.png" 
                           alt="Zapi KDS Pro" 
                           style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left', borderTopLeftRadius: '12px' }}
                           onError={(e) => {
                             // Fallback visually if image doesn't exist
                             e.currentTarget.style.display = 'none';
                             e.currentTarget.parentElement!.innerHTML += '<div style="padding: 1rem; color: #a3a3a3; font-size: 0.8rem; text-align: center; height: 100%; display: flex; align-items: center; justify-content: center; border: 2px dashed rgba(255,255,255,0.1); margin: 0 1rem 1rem; border-radius: 12px;">Pon aquí tu captura real<br/>(/public/images/kds-preview.png)</div>';
                           }}
                         />
                      </div>
                   </div>
                   <div className={styles.bentoCard} style={{ gridArea: 'side1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <QrCode size={36} color="#22c55e" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.75rem', color: '#fff' }}>Carta QR</span>
                   </div>
                   <div className={styles.bentoCard} style={{ gridArea: 'side2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '1.75rem', fontWeight: 800 }}>
                        <span style={{ color: '#22c55e' }}>0%</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#a3a3a3', fontWeight: 500 }}>Comisiones</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOGOS / SOCIAL PROOF */}
        <section className={styles.logosSection}>
          <div className={styles.container}>
            <p className={styles.logosTitle}>Integrado con los mejores sistemas y métodos de pago</p>
            <div className={styles.logosFlex}>
              <span className={styles.logoSpan}>STRIPE</span>
              <span className={styles.logoSpan}>APPLE PAY</span>
              <span className={styles.logoSpan}>GOOGLE PAY</span>
              <span className={styles.logoSpan}>REDSYS</span>
              <span className={styles.logoSpan}>BIZUM</span>
            </div>
          </div>
        </section>

        {/* EL PROBLEMA */}
        <section className={styles.problemsSection} id="problemas">
          <div className={styles.container}>
             <div className={styles.sectionHeader}>
               <h2 className={styles.sectionTitle}>El sector está roto. <br/>Tú trabajas, ellos ganan.</h2>
               <p className={styles.sectionSubtitle}>Gestionar un restaurante hoy en día significa depender de terceros que se llevan tu margen.</p>
             </div>
             
             <div className={styles.problemsGrid}>
               <div className={styles.problemCard}>
                 <div className={styles.problemIcon}><Euro size={24} color="#f87171" /></div>
                 <h3>Comisiones Abusivas</h3>
                 <p>Las plataformas de delivery se quedan hasta un 30% de cada pedido. Ganan el mismo dinero que tú pero sin cocinar.</p>
               </div>
               <div className={styles.problemCard}>
                 <div className={styles.problemIcon}><Clock size={24} color="#fbbf24" /></div>
                 <h3>Caos en Hora Punta</h3>
                 <p>Camareros saturados, errores al tomar nota, teléfonos colapsados y clientes fustrados intentando pedir o pagar.</p>
               </div>
               <div className={styles.problemCard}>
                 <div className={styles.problemIcon}><Store size={24} color="#60a5fa" /></div>
                 <h3>Sin control de Clientes</h3>
                 <p>Los clientes de las apps son suyos, no tuyos. No puedes fidelizarlos ni contactarles con campañas u ofertas.</p>
               </div>
             </div>
          </div>
        </section>

        {/* LA SOLUCIÓN - CÓMO FUNCIONA */}
        <section className={styles.howItWorksSection} id="como-funciona">
           <div className={styles.container}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>La Solución: Flujo <span className={styles.textGradient}>ZapiEat</span></h2>
                <p className={styles.sectionSubtitle}>Todo automatizado. Sin intervenir y sin errores. En 30 segundos el pedido está en la cocina.</p>
              </div>

              <div className={styles.stepsGrid}>
                 <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepIconBox}><Smartphone size={28} /></div>
                    <h3>El cliente escanea el QR</h3>
                    <p>Accede a tu carta digital hiper-optimizada. Elige, añade extras e introdiuce sus datos. Sin descargar apps.</p>
                 </div>
                 <div className={styles.stepArrow}><ChevronRight size={32} /></div>
                 
                 <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepIconBox}><CreditCard size={28} /></div>
                    <h3>Paga desde su móvil</h3>
                    <p>Paga al instante con Apple Pay, Wallet o Tarjeta. El dinero va directo a tu cuenta bancaria y en el acto.</p>
                 </div>
                 <div className={styles.stepArrow}><ChevronRight size={32} /></div>

                 <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>3</div>
                    <div className={styles.stepIconBox}><ChefHat size={28} /></div>
                    <h3>La cocina lo recibe</h3>
                    <p>Tu equipo lo ve al instante en la pantalla táctil de cocina (KDS). Organizado por prioridades y sin tickes perdidos.</p>
                 </div>
              </div>
           </div>
        </section>

        {/* FUNCIONALIDADES */}
        <section className={styles.featuresSection} id="funcionalidades">
          <div className={styles.container}>
            <div className={styles.featuresGrid}>
              <div className={styles.featuresText}>
                <h2 className={styles.sectionTitle} style={{ textAlign: "left" }}>
                  Todo lo que necesitas para escalar tu negocio
                </h2>
                <p className={styles.sectionSubtitle} style={{ textAlign: "left", margin: "1.5rem 0 2rem 0" }}>
                  ZapiEat está diseñado para ser rápido, fiable y aumentar tu ticket medio a través de upselling inteligente.
                </p>
                <div className={styles.featureList}>
                   <div className={styles.featureItem}>
                     <div className={styles.featureCheck}><CheckCircle2 size={24} /></div>
                     <div>
                       <strong>Delivery y Take Away propio</strong>
                       <p>Recibe pedidos a domicilio en tu propia web. Evita la comisión y construye tu propia base de datos.</p>
                     </div>
                   </div>
                   <div className={styles.featureItem}>
                     <div className={styles.featureCheck}><CheckCircle2 size={24} /></div>
                     <div>
                       <strong>Upselling Automático</strong>
                       <p>El sistema recomienda extras y bebidas inteligentemente, subiendo tu ticket medio un 15%.</p>
                     </div>
                   </div>
                   <div className={styles.featureItem}>
                     <div className={styles.featureCheck}><CheckCircle2 size={24} /></div>
                     <div>
                       <strong>Estadísticas Avanzadas</strong>
                       <p>Conoce qué platos son más rentables, las horas punta y qué clientes son los más fieles en ZapiPanel.</p>
                     </div>
                   </div>
                </div>
              </div>
              
              <div className={styles.featuresVisual}>
                 <div className={styles.dashMockupBig}>
                    <div className={styles.mockupNav}>
                      <div className={styles.mockupDots}><span></span><span></span><span></span></div>
                      <div className={styles.mockupSearch}></div>
                    </div>
                    <div className={styles.mockupContentRow}>
                      <div className={styles.mockupMetric}>
                         <div className={styles.metricTitle}></div>
                         <div className={styles.metricValue}></div>
                      </div>
                      <div className={styles.mockupMetric}>
                         <div className={styles.metricTitle}></div>
                         <div className={styles.metricValue} style={{ width: '60%' }}></div>
                      </div>
                    </div>
                    <div className={styles.mockupChartLarge}>
                       <div className={styles.chartLine}></div>
                       <div className={styles.chartPoints}>
                         <span></span><span></span><span></span><span></span><span></span>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPARATIVA */}
        <section className={styles.comparisonSection}>
           <div className={styles.container}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>¿Por qué elegir ZapiEat?</h2>
              </div>
              
              <div className={styles.tableWrapper}>
                <table className={styles.compareTable}>
                  <thead>
                    <tr>
                      <th>Características</th>
                      <th className={styles.colZapi}>ZapiEat ✨</th>
                      <th className={styles.colTraditional}>Apps Tradicionales</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Comisiones por pedido</td>
                      <td className={styles.cellSuccess}><CheckCircle2 size={18}/> 0% (Fijo Mensual)</td>
                      <td className={styles.cellDanger}>Hasta un 30% / 35%</td>
                    </tr>
                    <tr>
                      <td>Datos de tus clientes</td>
                      <td className={styles.cellSuccess}><CheckCircle2 size={18}/> Son tuyos 100%</td>
                      <td className={styles.cellDanger}>Pertencen a la app</td>
                    </tr>
                    <tr>
                      <td>Pedidos QR y Carta interactiva</td>
                      <td className={styles.cellSuccess}><CheckCircle2 size={18}/> Incluido</td>
                      <td className={styles.cellDanger}>No lo ofrecen</td>
                    </tr>
                    <tr>
                      <td>Control del dinero cobrado</td>
                      <td className={styles.cellSuccess}><CheckCircle2 size={18}/> Lo recibes al instante</td>
                      <td className={styles.cellDanger}>Liquidación quincenal</td>
                    </tr>
                  </tbody>
                </table>
              </div>
           </div>
        </section>

        {/* PRICING */}
        <section className={styles.pricingSection} id="precios">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
               <h2 className={styles.sectionTitle}>Precios simples, sin ataduras</h2>
               <p className={styles.sectionSubtitle}>Empieza a probar la plataforma hoy mismo. Escala a un plan mayor cuando lo necesites. Cancelas cuando quieras.</p>
            </div>

            <div className={styles.pricingCards}>
              <div className={styles.pricingCard}>
                 <div className={styles.planName}>Digital Básico</div>
                 <div className={styles.planPrice}>29€<span>/mes</span></div>
                 <p className={styles.planDesc}>Ideal para bares y pequeñas cafeterías que quieren eliminar el menú en papel e integrar pagos.</p>
                 <ul className={styles.planFeatures}>
                    <li><CheckCircle2 size={16} className={styles.featureIcon}/> Hasta 500 pedidos / mes</li>
                    <li><CheckCircle2 size={16} className={styles.featureIcon}/> Carta QR dinámica y rápida</li>
                    <li><CheckCircle2 size={16} className={styles.featureIcon}/> Toma de pedidos manual KDS</li>
                    <li><CheckCircle2 size={16} className={styles.featureIcon}/> Pasarela de pagos directos</li>
                 </ul>
                 <Link href="/login" className={styles.btnSecondaryFull}>Empieza Gratis (14 Días)</Link>
              </div>

              <div className={`${styles.pricingCard} ${styles.pricingCardPro}`}>
                 <div className={styles.planBadge}>Recomendado</div>
                 <div className={styles.planName}>Restaurante Pro</div>
                 <div className={styles.planPrice}>49€<span>/mes</span></div>
                 <p className={styles.planDesc}>Para restaurantes que quieren centralizar delivery, control total e ingresos sin comisiones.</p>
                 <ul className={styles.planFeatures}>
                    <li><CheckCircle2 size={16} className={styles.featureIcon}/> Pagos y Pedidos Ilimitados</li>
                    <li><CheckCircle2 size={16} className={styles.featureIcon}/> Pantalla de Cocina (KDS) Avanzada</li>
                    <li><CheckCircle2 size={16} className={styles.featureIcon}/> Tu propia web de Delivery</li>
                    <li><CheckCircle2 size={16} className={styles.featureIcon}/> Gestión multi-usuario</li>
                    <li><CheckCircle2 size={16} className={styles.featureIcon}/> Análisis de Rentabilidad</li>
                 </ul>
                 <Link href="/login" className={styles.btnPrimaryFull}>Empezar Plan Pro</Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className={styles.ctaSection}>
          <div className={styles.container}>
             <div className={styles.ctaCard}>
                <h2>¿Listo para digitalizar tu local y ganar más?</h2>
                <p>Únete a cientos de restaurantes que han roto las barreras de lo tradicional y ya no pagan comisiones altísimas. Configurado en 30 minutos.</p>
                <Link href="/login" className={styles.ctaFinalBtn}>  
                  Crear mi tienda 0% comisiones <ArrowRight size={20}/>
                </Link>
             </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
         <div className={styles.container}>
            <div className={styles.footerGrid}>
               <div className={styles.footerBrand}>
                 <span className={styles.logoText}>ZapiEat</span>
                 <p style={{ marginTop: '1rem', color: '#a3a3a3', fontSize: '0.9rem', lineHeight: 1.6 }}>El Sistema Operativo diseñado exclusivamente para la hostelería que no quiere depender de terceros para crecer.</p>
               </div>
               <div className={styles.footerLinks}>
                 <h4>Producto</h4>
                 <Link href="#">Pedidos por QR</Link>
                 <Link href="#">Delivery Propio</Link>
                 <Link href="#">Pasarela Integrada</Link>
                 <Link href="#">Precios</Link>
               </div>
               <div className={styles.footerLinks}>
                 <h4>Recursos</h4>
                 <Link href="#">Centro de Ayuda</Link>
                 <Link href="#">Guía de Configuración</Link>
                 <Link href="#">Blog del Sector</Link>
                 <Link href="#">Atención al Cliente</Link>
               </div>
               <div className={styles.footerLinks}>
                 <h4>Empresa</h4>
                 <Link href="#">Aviso Legal</Link>
                 <Link href="#">Política de Privacidad</Link>
                 <Link href="#">Términos y Condiciones</Link>
                 <Link href="#">Cookies</Link>
               </div>
            </div>
            <div className={styles.footerBottom}>
              <p>&copy; {new Date().getFullYear()} ZapiEat. Creado con ❤️ para la hostelería real.</p>
            </div>
         </div>
      </footer>
    </div>
  );
}
