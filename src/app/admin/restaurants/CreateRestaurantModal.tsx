"use client"

import React, { useMemo, useState, useTransition } from "react"
import { Plus, X } from "lucide-react"

import styles from "./restaurants.module.css"
import { Portal } from "@/components/ui/Portal"
import { createRestaurantWithAdminAction } from "./actions"

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

export function CreateRestaurantModal() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState("")
  const [restaurantSlug, setRestaurantSlug] = useState("")

  const autoSlug = useMemo(() => slugify(restaurantName), [restaurantName])

  const close = () => {
    setOpen(false)
    setError(null)
    setRestaurantName("")
    setRestaurantSlug("")
  }

  return (
    <>
      <button className={styles.addBtn} onClick={() => setOpen(true)}>
        <Plus size={16} />
        Anadir Nuevo Restaurante
      </button>

      {open && (
        <Portal>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1.5rem",
              zIndex: 60,
            }}
            onClick={(e) => e.target === e.currentTarget && close()}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 680,
                background: "#1c1917",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontWeight: 700 }}>Crear Restaurante + Admin</div>
                <button
                  type="button"
                  onClick={close}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#d6d3d1",
                    cursor: "pointer",
                    padding: 6,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <form
                style={{ padding: "1.25rem", display: "grid", gap: "0.9rem" }}
                onSubmit={(e) => {
                  e.preventDefault()
                  setError(null)

                  const fd = new FormData(e.currentTarget)
                  if (!fd.get("restaurantSlug")) {
                    fd.set("restaurantSlug", restaurantSlug || autoSlug)
                  }

                  startTransition(async () => {
                    const res = await createRestaurantWithAdminAction(null, fd)
                    if (res?.error) {
                      setError(res.error)
                      return
                    }
                    close()
                  })
                }}
              >
                {error && (
                  <div
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      color: "#fecaca",
                      padding: "0.75rem",
                      borderRadius: 12,
                    }}
                  >
                    {error}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>
                      Nombre del restaurante
                    </label>
                    <input
                      name="restaurantName"
                      value={restaurantName}
                      onChange={(e) => {
                        setRestaurantName(e.target.value)
                        if (!restaurantSlug) return
                      }}
                      required
                      disabled={isPending}
                      style={{
                        width: "100%",
                        padding: "0.7rem 0.8rem",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#fafaf9",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>
                      Slug (url)
                    </label>
                    <input
                      name="restaurantSlug"
                      value={restaurantSlug}
                      onChange={(e) => setRestaurantSlug(e.target.value)}
                      placeholder={autoSlug || "mi-restaurante"}
                      required
                      disabled={isPending}
                      style={{
                        width: "100%",
                        padding: "0.7rem 0.8rem",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#fafaf9",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>
                      Email admin
                    </label>
                    <input
                      type="email"
                      name="adminEmail"
                      required
                      disabled={isPending}
                      style={{
                        width: "100%",
                        padding: "0.7rem 0.8rem",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#fafaf9",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>
                      Nombre admin (opcional)
                    </label>
                    <input
                      name="adminName"
                      disabled={isPending}
                      style={{
                        width: "100%",
                        padding: "0.7rem 0.8rem",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#fafaf9",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>
                    Password admin
                  </label>
                  <input
                    type="password"
                    name="adminPassword"
                    required
                    disabled={isPending}
                    style={{
                      width: "100%",
                      padding: "0.7rem 0.8rem",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#fafaf9",
                    }}
                  />
                  <div style={{ marginTop: 6, fontSize: 12, color: "#78716c" }}>
                    Minimo 8 caracteres.
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={close}
                    disabled={isPending}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#d6d3d1",
                      padding: "0.6rem 0.9rem",
                      borderRadius: 12,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    style={{
                      background: "#f97316",
                      border: "none",
                      color: "#0c0a09",
                      padding: "0.6rem 0.9rem",
                      borderRadius: 12,
                      cursor: "pointer",
                      fontWeight: 700,
                      opacity: isPending ? 0.7 : 1,
                    }}
                  >
                    {isPending ? "Creando..." : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
