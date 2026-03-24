import * as React from "react"
import styles from "./input.module.css"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, type, ...props }, ref) => {
    const classNames = [
      styles.input,
      error ? styles.error : "",
      className
    ].filter(Boolean).join(" ")

    return (
      <input
        type={type}
        className={classNames}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
