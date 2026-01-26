import * as React from "react"
import { cn } from "@/utils/cn"

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

function renderWithRedAsterisks(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string") {
    const parts = node.split("*")
    if (parts.length === 1) return node

    return parts.flatMap((segment, index) => [
      segment,
      index < parts.length - 1 && (
        <span key={`asterisk-${index}`} className="text-destructive">
          *
        </span>
      ),
    ])
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <React.Fragment key={`child-${index}`}>
        {renderWithRedAsterisks(child)}
      </React.Fragment>
    ))
  }

  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    return React.cloneElement(element, undefined, renderWithRedAsterisks(element.props.children))
  }

  return node
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        {...props}
      >
        {renderWithRedAsterisks(children)}
      </label>
    )
  }
)
Label.displayName = "Label"

export { Label }
