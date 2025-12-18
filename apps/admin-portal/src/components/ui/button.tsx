import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-px hover:shadow-lg active:translate-y-0",
  {
    variants: {
      variant: {
        default: "bg-red-600 text-white shadow-md hover:bg-red-700 active:scale-95",
        destructive: "bg-red-600 text-white shadow-md hover:bg-red-700 active:scale-95",
        outline: "border-2 border-gray-300 bg-transparent hover:bg-gray-50 hover:border-gray-400 hover:shadow-md",
        secondary: "bg-black text-white shadow-md hover:bg-zinc-800 active:scale-95",
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
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
