import * as React from "react"
import styles from "./label.module.css"

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  error?: string
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = "", error, children, ...props }, ref) => {
    return (
      <div className={className}>
        <label
          ref={ref}
          className={`${styles.label} ${props.htmlFor ? "" : styles.disabled}`}
          {...props}
        >
          {children}
        </label>
        {error && <span className={styles.error}>{error}</span>}
      </div>
    )
  }
)
Label.displayName = "Label"
