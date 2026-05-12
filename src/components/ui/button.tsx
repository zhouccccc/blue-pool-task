import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'danger', size?: 'default' | 'sm' | 'icon' }>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-blue-600 text-white hover:bg-blue-700 shadow-sm": variant === 'default',
            "border border-blue-200 bg-white hover:bg-blue-50 text-blue-700": variant === 'outline',
            "hover:bg-blue-100/50 hover:text-blue-900 text-blue-600": variant === 'ghost',
            "bg-red-50 text-red-600 hover:bg-red-100": variant === 'danger',
            "h-10 px-4 py-2": size === 'default',
            "h-8 rounded-md px-3": size === 'sm',
            "h-10 w-10": size === 'icon',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
