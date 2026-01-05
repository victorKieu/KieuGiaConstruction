// lib/utils/utils.ts
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: any[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined, currency: string = "VND", locale: string = "vi-VN"): string {
    if (amount === null || amount === undefined) {
        return "0" + (currency === "VND" ? " ₫" : ""); // Hiển thị "0 ₫" nếu dữ liệu là null/undefined
    }
    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0, // Không hiển thị số lẻ cho VND
        maximumFractionDigits: 0, // Không hiển thị số lẻ cho VND
    });
    return formatter.format(amount);
}

export function formatDate(date: string | Date): string {
    if (!date) return "Không xác định";
    return new Date(date).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })
}

export function getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
        case "active":
        case "completed":
        case "approved":
            return "bg-green-100 text-green-800"
        case "pending":
        case "in_progress":
        case "in progress":
            return "bg-blue-100 text-blue-800"
        case "delayed":
        case "rejected":
        case "inactive":
            return "bg-red-100 text-red-800"
        case "on_hold":
        case "on hold":
        case "waiting":
            return "bg-yellow-100 text-yellow-800"
        default:
            return "bg-gray-100 text-gray-800"
    }
}
// Cập nhật hàm formatNumber: đảm bảo trả về "0" nếu dữ liệu là null/undefined
export function formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined) {
        return "0";
    }
    return new Intl.NumberFormat('vi-VN').format(num);
}
