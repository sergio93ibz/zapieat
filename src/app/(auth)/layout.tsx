import React from "react"
import styles from "./auth.module.css"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <h1>
            Zapi<span>Eat</span>
          </h1>
          <p style={{ marginTop: "0.5rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
            Tap. Order. Enjoy.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
