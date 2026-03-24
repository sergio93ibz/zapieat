import React from "react"
import { CheckCircle, ArrowLeft, Package, Clock, MapPin } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { StorefrontReviewForm } from "../StorefrontReviewForm"

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ orderId?: string }>
}

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { orderId } = await searchParams

  if (!orderId) {
    return notFound()
  }

  const order = await (prisma.order as any).findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          modifiers: true
        }
      },
      table: true
    }
  }) as any

  if (!order) {
    return notFound()
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0c0a09', color: '#fafaf9', padding: '4rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
          <CheckCircle size={48} color="#22c55e" />
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>¡Pedido Recibido!</h1>
        <p style={{ color: '#a8a29e', fontSize: '1.125rem', marginBottom: '3rem' }}>
          Gracias por tu pedido, {order.customerName}. Ya estamos trabajando en él.
        </p>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '2rem', textAlign: 'left', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Pedido #{order.orderNumber}</span>
            <span style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#f97316', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
              {order.status}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {order.type === "DELIVERY" && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Clock size={20} color="#f97316" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Tiempo estimado</div>
                  <div style={{ color: '#a8a29e', fontSize: '0.85rem' }}>25 - 35 minutos</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <MapPin size={20} color="#f97316" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {order.type === "TABLE" ? "Servido en" : (order.type === "DELIVERY" ? "Dirección de entrega" : "Punto de recogida")}
                </div>
                <div style={{ color: '#a8a29e', fontSize: '0.85rem' }}>
                  {order.type === "TABLE" && (order as any).table 
                    ? (((order as any).table.name.toLowerCase().includes('mesa') ? (order as any).table.name : `Mesa ${(order as any).table.name}`))
                    : order.deliveryAddress}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Package size={20} color="#f97316" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Resumen del pedido</div>
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#a8a29e' }}>{item.quantity}x {item.productNameSnapshot}</span>
                    <span>{(Number(item.unitPrice) * item.quantity).toFixed(2)}€</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>Total</span>
                  <span style={{ color: '#f97316' }}>{Number(order.total).toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>

          {/* REVIEW FORM */}
          <StorefrontReviewForm
            restaurantId={order.restaurantId}
            orderId={order.id}
            customerId={order.customerId || undefined}
            customerName={order.customerName || undefined}
          />
        </div>

        <Link
          href={order.tableId ? `/${slug}/table/${order.tableId}` : `/${slug}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#f97316', fontWeight: 600, textDecoration: 'none' }}
        >
          <ArrowLeft size={18} />
          Volver a la carta
        </Link>
      </div>
    </div>
  )
}
