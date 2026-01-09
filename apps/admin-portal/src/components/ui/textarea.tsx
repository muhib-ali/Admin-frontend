import * as React from "react"

import { cn } from "@/utils/cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[40px] w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-600/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-70",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
