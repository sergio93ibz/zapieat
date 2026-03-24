"use client"

import React, { useActionState } from "react"
import { loginAction } from "./actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import styles from "./login.module.css"

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, undefined)

  return (
    <Card>
      <CardHeader>
        <CardTitle>ZapiPanel</CardTitle>
        <CardDescription>
          <span style={{ fontWeight: 700, color: "var(--color-secondary)" }}>Tap. Order. Enjoy.</span> Accede para gestionar tu restaurante.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className={styles.form}>
          {state?.error && (
            <div className={styles.errorAlert}>{state.error}</div>
          )}
          <div className={styles.inputGroup}>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="admin@zapieat.com"
              required
              disabled={isPending}
            />
          </div>
          <div className={styles.inputGroup}>
            <Label htmlFor="password">Contrasena</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isPending}
            />
          </div>
          <Button type="submit" disabled={isPending} style={{ marginTop: '0.5rem' }}>
            {isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
      <CardFooter style={{ justifyContent: 'center' }}>
        <Button variant="link" size="sm" type="button">
          He olvidado mi contrasena
        </Button>
      </CardFooter>
    </Card>
  )
}
