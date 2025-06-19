"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import supabase from '@/lib/supabase/client';

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm("Bạn có chắc muốn xóa khách hàng này? Thao tác này không thể hoàn tác!")) return
    setLoading(true)
    //const supabase = createClient()
    const { error } = await supabase.from("customers").delete().eq("id", customerId)
    setLoading(false)
    if (error) {
      alert("Xóa khách hàng thất bại: " + error.message)
    } else {
      router.push("/crm/customers")
    }
  }

  return (
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? "Đang xóa..." : "Xóa"}
    </Button>
  )
}