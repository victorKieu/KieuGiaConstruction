"use client"

import { FC } from "react"

interface GenderDisplayProps {
    gender?: string // "male" | "female" | "other"
    showLabel?: boolean // mặc định true
}

const genderMap: Record<string, { label: string; icon: string }> = {
    male: { label: "Nam", icon: "♂️" },
    female: { label: "Nữ", icon: "♀️" },
    other: { label: "Khác", icon: "⚧" },
}

export const GenderDisplay: FC<GenderDisplayProps> = ({ gender, showLabel = true }) => {
    const g = genderMap[gender ?? ""] || { label: "Không xác định", icon: "❓" }

    return (
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <span>{g.icon}</span>
            {showLabel && <span>{g.label}</span>}
        </span>
    )
}