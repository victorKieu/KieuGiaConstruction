"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Định nghĩa kiểu props thủ công để tránh lỗi type import từ dist
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}