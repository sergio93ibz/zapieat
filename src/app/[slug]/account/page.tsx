import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customerAuth";
import { StorefrontLayout } from "../StorefrontLayout";
import { UserCircle, MapPin, CreditCard, ShoppingBag, Star, Info } from "lucide-react";

export default async function CustomerAccountPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug }
  });

  if (!restaurant) return notFound();

  const session = await getCustomerSession();
  if (!session || session.restaurantId !== restaurant.id) {
     return redirect(`/${slug}`);
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId }
  });

  if (!customer) return redirect(`/${slug}`);

  // Fetch orders later (just mocking the interface for now)
  const orders = await prisma.order.findMany({
    where: { customerId: customer.id, restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  return (
    <StorefrontLayout>
      <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
         <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', color: '#111' }}>
           <UserCircle size={40} color="#f97316" />
           Mi Cuenta
         </h1>

         <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            {/* Tarjeta de Lealtad */}
            <div style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: '24px', padding: '2.5rem', color: '#fff', boxShadow: '0 20px 40px rgba(249, 115, 22, 0.4)', position: 'relative', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', top: '-10%', right: '-5%', opacity: 0.1, transform: 'rotate(15deg)' }}>
                  <Star size={200} fill="#fff" />
               </div>
               
               <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Mi Saldo ZapiPoints</h2>
                      <div style={{ fontSize: '4rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem', lineHeight: 1 }}>
                        {(customer as any).loyaltyPoints} <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>pts</span>
                      </div>
                    </div>
                    {(restaurant as any).enableLoyalty && (
                      <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.6rem 1.25rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}>
                         ¡Sistema Activo!
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                       <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600, marginBottom: '0.25rem' }}>Equivale a</div>
                       <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                          {((customer as any).loyaltyPoints * Number((restaurant as any).loyaltyPointsValue || 0)).toFixed(2)}€
                       </div>
                    </div>
                    {restaurant.enableLoyalty && (
                      <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600, marginBottom: '0.25rem' }}>Mínimo para canjear</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{restaurant.loyaltyMinPointsToRedeem} pts</div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Info size={18} />
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
                      {(restaurant as any).enableLoyalty 
                        ? `Consigue ${(restaurant as any).loyaltyPointsPerEuro} puntos por cada 1€ de compra. ¡Úsalos en tu próximo pedido!` 
                        : "Estamos preparando sorpresas. ¡Pronto podrás canjear tus puntos por comida gratis!"}
                    </p>
                  </div>
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
               {/* Datos Personales */}
               <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #eee' }}>
                 <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <UserCircle size={20} /> Perfil
                 </h3>
                 <div style={{ color: '#555', fontSize: '0.95rem', lineHeight: '1.8' }}>
                   <strong>Teléfono:</strong> {customer.phone || "No establecido"}<br />
                   <strong>Nombre:</strong> {customer.name || "Añadir nombre..."}<br />
                   <strong>Email:</strong> {customer.email || "Añadir email..."}
                 </div>
               </div>

               {/* Direcciones */}
               <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #eee' }}>
                 <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <MapPin size={20} /> Direcciones
                 </h3>
                 <div style={{ color: '#888', fontSize: '0.95rem', fontStyle: 'italic' }}>
                   No tienes direcciones guardadas todavía. Se guardarán automáticamente en tu próximo pedido a domicilio.
                 </div>
               </div>

               {/* Métodos de pago */}
               <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #eee' }}>
                 <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <CreditCard size={20} /> Pagos Guardados
                 </h3>
                 <div style={{ color: '#888', fontSize: '0.95rem', fontStyle: 'italic' }}>
                   Sin tarjetas registradas.
                 </div>
               </div>
            </div>

            {/* Ultimos Pedidos */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #eee' }}>
               <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <ShoppingBag size={20} /> Historial de Pedidos
               </h3>
               {orders.length === 0 ? (
                  <p style={{ color: '#888', fontSize: '0.95rem' }}>Aún no has realizado ningún pedido con esta cuenta.</p>
               ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                     {orders.map(o => (
                       <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid #f5f5f5' }}>
                         <div>
                           <div style={{ fontWeight: 700 }}>Ticket #{o.orderNumber}</div>
                           <div style={{ fontSize: '0.85rem', color: '#666' }}>{o.createdAt.toLocaleDateString()}</div>
                         </div>
                         <div style={{ fontWeight: 800, color: '#f97316' }}>{Number(o.total).toFixed(2)}€</div>
                       </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      </div>
    </StorefrontLayout>
  );
}
