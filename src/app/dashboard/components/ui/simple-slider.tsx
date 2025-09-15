"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const SimpleSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-slate-200/20 dark:bg-slate-800/40">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full bg-white border-0 shadow-lg shadow-blue-500/30 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 transition-transform duration-200" />
  </SliderPrimitive.Root>
))
SimpleSlider.displayName = SliderPrimitive.Root.displayName

export { SimpleSlider }
