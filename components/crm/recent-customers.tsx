"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { getRecentCustomers } from "@/lib/action/crmActions"

interface Customer {
    id: string
    name: string
    email: string
    created_at: string
}

export function RecentCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchRecentCustomers() {
            try {
                const recentCustomers = await getRecentCustomers()
                setCustomers(recentCustomers)
            } catch (error) {
                console.error("Error fetching recent customers:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchRecentCustomers()
    }, [])

    if (isLoading) {
        return (
            <div className="space-y-8">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center animate-pulse">
                        <div className="h-9 w-9 rounded-full bg-muted/50" />
                        <div className="ml-4 space-y-2">
                            <div className="h-4 w-[150px] bg-muted/50 rounded" />
                            <div className="h-3 w-[100px] bg-muted/50 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (customers.length === 0) {
        return <div className="text-center py-8 text-muted-foreground text-sm">Chưa có khách hàng nào gần đây</div>
    }

    return (
        <div className="space-y-8">
            {customers.map((customer) => {
                // Lấy chữ cái đầu tiên
                const initials = customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .substring(0, 2)

                return (
                    <div key={customer.id} className="flex items-center group">
                        {/* ✅ FIX: Avatar màu primary nhẹ, đẹp trên dark mode */}
                        <Avatar className="h-9 w-9 border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                                {initials}
                            </AvatarFallback>
                        </Avatar>

                        <div className="ml-4 space-y-1">
                            <Link
                                href={`/crm/customers/${customer.id}`}
                                className="text-sm font-medium leading-none text-foreground hover:text-primary hover:underline transition-colors block"
                            >
                                {customer.name}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {customer.email || "Không có email"}
                            </p>
                        </div>

                        <div className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(customer.created_at), {
                                addSuffix: true,
                                locale: vi,
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}