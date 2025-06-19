"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import supabase from '@/lib/supabase/client';
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Download, FileText } from "lucide-react"


interface Contract {
  id: string
  title: string
  description: string
  contract_value: number
  start_date: string
  end_date: string
  status: string
  created_at: string
  file_url?: string
}

interface CustomerContractsProps {
  customerId: string
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  expired: "bg-amber-100 text-amber-800",
  terminated: "bg-red-100 text-red-800",
}

export function CustomerContracts({ customerId }: CustomerContractsProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchContracts() {
      try {
        //const supabase = createClient()

        const { data, error } = await supabase
          .from("contracts")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })

        if (error) throw error

        setContracts(data || [])
      } catch (error) {
        console.error("Error fetching customer contracts:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContracts()
  }, [customerId])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(2)
          .fill(0)
          .map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-16 bg-muted/20"></CardHeader>
              <CardContent className="h-24 bg-muted/10"></CardContent>
              <CardFooter className="h-12 bg-muted/20"></CardFooter>
            </Card>
          ))}
      </div>
    )
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-10">
          <p className="text-muted-foreground mb-4">Chưa có hợp đồng nào với khách hàng này</p>
          <Button>Thêm hợp đồng mới</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {contracts.map((contract) => {
        const statusColor = statusColors[contract.status] || "bg-gray-100 text-gray-800"
        const statusLabel =
          {
            draft: "Bản nháp",
            active: "Đang hiệu lực",
            expired: "Hết hạn",
            terminated: "Đã hủy",
          }[contract.status] || contract.status

        return (
          <Card key={contract.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{contract.title}</CardTitle>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>
              <CardDescription className="text-xs">
                Hiệu lực: {format(new Date(contract.start_date), "dd/MM/yyyy", { locale: vi })} -{" "}
                {format(new Date(contract.end_date), "dd/MM/yyyy", { locale: vi })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2 space-y-3">
              <p className="text-sm">{contract.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Giá trị hợp đồng:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                    maximumFractionDigits: 0,
                  }).format(contract.contract_value)}
                </span>
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex justify-between">
              <span className="text-xs text-muted-foreground">
                Tạo lúc: {format(new Date(contract.created_at), "PPp", { locale: vi })}
              </span>
              <div className="flex gap-2">
                {contract.file_url && (
                  <Button size="sm" variant="outline" className="h-7 gap-1">
                    <Download className="h-3 w-3" /> Tải xuống
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7">
                  Xem chi tiết
                </Button>
              </div>
            </CardFooter>
          </Card>
        )
      })}
      <div className="flex justify-center">
        <Button>Thêm hợp đồng mới</Button>
      </div>
    </div>
  )
}
