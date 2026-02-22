import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CustomerTable } from "@/components/crm/CustomerTable";
import { Pagination } from "@/components/ui/pagination-custom";
import { CustomersToolbar } from "./customers-toolbar";

const ITEMS_PER_PAGE = 10;

interface Props {
    currentPage: number;
    query?: string;
    status?: string;
}

export async function CustomersFilterAndList({ currentPage, query, status }: Props) {
    const supabase = await createSupabaseServerClient();

    // 1. Tính toán phân trang
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // 2. Xây dựng Query cơ bản
    // Lưu ý: Tên relation (fkey) phải khớp chính xác với DB của bạn
    let dbQuery = supabase
        .from("customers")
        .select(`
            *,
            type_rel:sys_dictionaries!customers_type_fkey(name, color),
            status_rel:sys_dictionaries!customers_status_fkey(name, color, code),
            source_rel:sys_dictionaries!customers_source_id_fkey(name, color)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    // 3. Áp dụng bộ lọc
    // Lọc theo tên hoặc số điện thoại
    if (query) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
    }

    // Lọc theo trạng thái (status code)
    if (status && status !== "all") {
        // Lấy ID của status code từ bảng từ điển
        const { data: statusDict } = await supabase
            .from("sys_dictionaries")
            .select("id")
            .eq("category", "CRM_CUSTOMER_STATUS")
            .eq("code", status)
            .single();

        if (statusDict) {
            dbQuery = dbQuery.eq("status", statusDict.id);
        } else {
            // Nếu có status trên URL nhưng không tìm thấy ID tương ứng trong DB -> Trả về rỗng để báo hiệu
            // (Hoặc có thể bỏ qua để hiển thị all, tùy logic nghiệp vụ)
            dbQuery = dbQuery.eq("id", "00000000-0000-0000-0000-000000000000"); // Hack để trả về rỗng
        }
    }

    // 4. Thực thi Query
    const { data: customers, count, error } = await dbQuery;

    if (error) {
        console.error("Error fetching customers:", error);
        // ✅ FIX: Text color theme
        return <div className="text-destructive p-4">Không thể tải dữ liệu khách hàng.</div>;
    }

    const totalPages = count ? Math.ceil(count / ITEMS_PER_PAGE) : 0;

    return (
        <div className="space-y-4">
            {/* Toolbar điều khiển URL */}
            <CustomersToolbar />

            {/* Danh sách hiển thị */}
            {/* ✅ FIX: bg-white -> bg-card, border -> border-border */}
            <div className="rounded-md border border-border bg-card shadow-sm overflow-hidden">
                <CustomerTable data={customers || []} />
            </div>

            {/* Phân trang */}
            <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
                <div className="text-sm text-muted-foreground">
                    Hiển thị <strong>{customers?.length ? from + 1 : 0}-{Math.min(to + 1, count || 0)}</strong> trên tổng số <strong>{count}</strong> khách hàng
                </div>

                <Pagination
                    totalPages={totalPages}
                    currentPage={currentPage}
                />
            </div>
        </div>
    );
}