"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Cookie, X, Check } from "lucide-react"
import styles from "@/app/[slug]/storefront.module.css"

export function CookieBanner({ restaurantSlug }: { restaurantSlug: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const KEY = "zapieat_cookie_consent"
  const LEGACY_KEY = "zasfood_cookie_consent"

  useEffect(() => {
    const consent = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (!consent) {
      // Delay showing for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(KEY, "accepted")
    setIsVisible(false)
  }

  const handleDecline = () => {
    localStorage.setItem(KEY, "declined")
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className={styles.cookieBanner}>
      <div className={styles.cookieContent}>
        <div className={styles.cookieIcon}>
          <Cookie size={24} />
        </div>
        <div className={styles.cookieText}>
          <h4>Aviso de Cookies</h4>
          <p>
            Utilizamos cookies propias y de terceros para mejorar tu experiencia y mostrarte contenido personalizado. 
            Puedes consultar nuestra <Link href={`/${restaurantSlug}/info/cookies`}>Política de Cookies</Link> para más información.
          </p>
        </div>
        <div className={styles.cookieActions}>
          <button onClick={handleDecline} className={styles.cookieDecline}>
            Solo necesarias
          </button>
          <button onClick={handleAccept} className={styles.cookieAccept}>
            <Check size={16} /> Aceptar todas
          </button>
        </div>
        <button onClick={() => setIsVisible(false)} className={styles.cookieClose}>
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
