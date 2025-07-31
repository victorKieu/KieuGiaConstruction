"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import supabase from '@/lib/supabase/client';
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { getRecentCustomers } from "@/lib/action/crmActions"; // Đường dẫn đến hàm getRecentCustomers


interface Customer {
  id: string
  name: string
  email: string
  created_at: string
}

export function RecentCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchRecentCustomers() {
            try {
                const recentCustomers = await getRecentCustomers(); // Gọi hàm getRecentCustomers
                setCustomers(recentCustomers);
            } catch (error) {
                console.error("Error fetching recent customers:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchRecentCustomers();
    }, []);

    if (isLoading) {
        return <div>Loading recent customers...</div>;
    }

    if (customers.length === 0) {
        return <div className="text-center py-4 text-muted-foreground">Chưa có khách hàng nào</div>;
    }

    return (
        <div className="space-y-8">
            {customers.map((customer) => {
                // Lấy chữ cái đầu tiên của tên khách hàng cho avatar
                const initials = customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .substring(0, 2)

                return (
                    <div key={customer.id} className="flex items-center">
                        <Avatar className="h-9 w-9">
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                            <Link href={`/crm/customers/${customer.id}`} className="text-sm font-medium leading-none hover:underline">
                                {customer.name}
                            </Link>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                        </div>
                        <div className="ml-auto text-sm text-muted-foreground">
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

  
