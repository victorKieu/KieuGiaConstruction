import type { Metadata } from "next"
import { CustomersFilterAndList } from "@/components/crm/customers-filter-and-list"

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    title: "Quản lý khách hàng | CRM | Kieu Gia Construction",
    description: "Quản lý thông tin và tương tác với khách hàng",
}


export default function CustomersPage() {
    return (
        <div className="flex flex-col">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Danh Sách khách hàng</h2>
            <CustomersFilterAndList />
        </div>
    )
}
// thiếu phân trang