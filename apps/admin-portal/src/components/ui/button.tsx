import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-sm hover:shadow-md active:shadow-sm active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-red-600 text-white hover:bg-red-700",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border-2 border-gray-300 bg-transparent hover:bg-gray-50 hover:border-gray-400 hover:shadow-md active:bg-gray-100",
        secondary:
          "border-2 border-red-600 bg-white text-red-600 hover:bg-red-50 hover:shadow-md active:bg-red-100",
        pagination: "border-2 border-red-600 bg-transparent text-red-600 hover:bg-red-50 hover:shadow-md active:bg-red-100",
        ghost: "hover:bg-gray-100 hover:text-gray-900",
        link: "text-red-600 underline-offset-4 hover:underline hover:text-red-700",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  toggleVariantOnClick?: boolean
  clickVariant?: ButtonProps["variant"]
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, toggleVariantOnClick, clickVariant, onClick, ...props },
    ref
  ) => {
    const isPagination = (variant ?? "default") === "pagination"
    const [pressed, setPressed] = React.useState(false)

    const [localVariant, setLocalVariant] = React.useState<ButtonProps["variant"]>(
      variant ?? "default"
    )

    React.useEffect(() => {
      setLocalVariant(variant ?? "default")
    }, [variant])

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (clickVariant) {
        setLocalVariant(clickVariant)
      } else if (toggleVariantOnClick) {
        setLocalVariant((v) => (v === "secondary" ? "default" : "secondary"))
      }
      onClick?.(e)
    }

    return (
      <button
        className={cn(
          buttonVariants({
            variant: !isPagination && pressed ? "secondary" : localVariant ?? variant,
            size,
            className,
          })
        )}
        ref={ref}
        onClick={handleClick}
        onPointerDown={(e) => {
          if (!isPagination) setPressed(true)
          props.onPointerDown?.(e)
        }}
        onPointerUp={(e) => {
          setPressed(false)
          props.onPointerUp?.(e)
        }}
        onPointerCancel={(e) => {
          setPressed(false)
          props.onPointerCancel?.(e)
        }}
        onPointerLeave={(e) => {
          setPressed(false)
          props.onPointerLeave?.(e)
        }}
        onBlur={(e) => {
          setPressed(false)
          props.onBlur?.(e)
        }}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
