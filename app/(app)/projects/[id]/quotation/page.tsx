import { Suspense } from "react"
import { getQuotations, getQuotationById } from "@/lib/action/quotationActions"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import QuotationList from "@/components/projects/quotation/quotation-list"
import QuotationPageClient from "./page-client" // Tách Client Component để xử lý state Form

// Server Component chính
export default async function QuotationPage({ params }: { params: { id: string } }) {
    const projectId = params.id

    // Fetch dữ liệu danh sách
    const { data: quotations } = await getQuotations(projectId)

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Quản lý Báo Giá</h1>
                    <p className="text-sm text-slate-500">Lập và quản lý các báo giá cho dự án này</p>
                </div>
            </div>

            {/* Gọi Client Component để xử lý logic đóng mở form */}
            <QuotationPageClient
                projectId={projectId}
                quotations={quotations || []}
            />
        </div>
    )
}