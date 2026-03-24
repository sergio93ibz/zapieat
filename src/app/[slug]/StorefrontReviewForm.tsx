"use client"

import React, { useState } from "react"
import { Star, Send, Check } from "lucide-react"
import { submitReviewAction } from "./customerActions"

interface ReviewFormProps {
  restaurantId: string
  orderId: string
  customerId?: string
  customerName?: string
}

export function StorefrontReviewForm({ restaurantId, orderId, customerId, customerName }: ReviewFormProps) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await submitReviewAction({
      restaurantId,
      orderId,
      customerId,
      rating,
      comment,
      customerName: customerName || "Cliente"
    })

    setLoading(false)
    if (res.error) {
      setError(res.error)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '24px', padding: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <Check size={24} color="#22c55e" />
        </div>
        <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>¡Gracias por tu opinión!</h3>
        <p style={{ margin: 0, color: '#a8a29e', fontSize: '0.9rem' }}>Tu valoración ayuda a otros clientes a disfrutar de la mejor experiencia.</p>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '2rem', textAlign: 'left', marginBottom: '2rem' }}>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700 }}>¿Qué te ha parecido la experiencia?</h3>
      <p style={{ margin: '0 0 1.5rem 0', color: '#a8a29e', fontSize: '0.9rem' }}>Nos encantaría saber tu opinión sobre este pedido.</p>

      {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Star 
                size={32} 
                fill={s <= rating ? "#f97316" : "transparent"} 
                color={s <= rating ? "#f97316" : "#444"} 
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Dinos qué te ha gustado, o en qué podemos mejorar (opcional)..."
          style={{
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '1rem',
            color: '#fff',
            fontSize: '0.95rem',
            minHeight: '100px',
            resize: 'none',
            marginBottom: '1.5rem',
            outline: 'none'
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: '#f97316',
            color: '#fff',
            border: 'none',
            padding: '1rem',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            transition: 'all 0.2s',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Enviando..." : <><Send size={18} /> Enviar valoración</>}
        </button>
      </form>
    </div>
  )
}
