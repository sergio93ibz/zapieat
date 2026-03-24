import * as React from "react"
import styles from "./button.module.css"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "link"
  size?: "sm" | "md" | "lg" | "icon"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "md", ...props }, ref) => {
    const classNames = [
      styles.btn,
      styles[variant],
      styles[size],
      className
    ].filter(Boolean).join(" ")

    return (
      <button
        ref={ref}
        className={classNames}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
