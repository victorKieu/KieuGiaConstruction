"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils/utils" // Lưu ý: Kiểm tra đường dẫn utils của bạn, có thể là "@/lib/utils"

// Định nghĩa thêm prop indicatorClassName
type ProgressProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string
}

const Progress = React.forwardRef<
    React.ElementRef<typeof ProgressPrimitive.Root>,
    ProgressProps
>(({ className, value, indicatorClassName, ...props }, ref) => (
    <ProgressPrimitive.Root
        ref={ref}
        className={cn(
            "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
            className
        )}
        {...props}
    >
        <ProgressPrimitive.Indicator
            // 👇 SỬ DỤNG indicatorClassName Ở ĐÂY ĐỂ ĐỔI MÀU
            className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
            style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
    </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }