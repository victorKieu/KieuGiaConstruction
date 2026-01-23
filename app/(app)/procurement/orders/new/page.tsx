import { getSuppliers, getMaterialRequestForPO } from "@/lib/action/procurement";
import { getProjectsForSelect } from "@/lib/action/finance";
import PurchaseOrderForm from "@/components/procurement/PurchaseOrderForm"; // Sử dụng lại Component chuẩn này

export default async function NewOrderPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // 1. Lấy tham số requestId từ URL (Khi bấm từ CentralRequestManager)
    const params = await searchParams;
    const requestId = typeof params.requestId === "string" ? params.requestId : undefined;

    // 2. Lấy dữ liệu danh mục (NCC, Dự án) song song để tối ưu tốc độ
    const [suppliers, projects] = await Promise.all([
        getSuppliers(),
        getProjectsForSelect()
    ]);

    // 3. Nếu có requestId -> Lấy chi tiết vật tư cần mua từ Server Action
    let initialItems: any[] = [];
    let initialRequestId = undefined;

    if (requestId) {
        // Hàm này (đã thêm ở bước trước) sẽ trả về danh sách vật tư CÒN THIẾU
        const reqData = await getMaterialRequestForPO(requestId);
        if (reqData) {
            initialItems = reqData.items;
            initialRequestId = requestId;
        }
    }

    // 4. Render Form và truyền dữ liệu vào
    // Form sẽ tự quyết định hiển thị giao diện "Split PO" hay "Manual PO" dựa trên props
    return (
        <div className="flex-1 p-8 pt-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
            <PurchaseOrderForm
                suppliers={suppliers}
                projects={projects}
                initialRequestId={initialRequestId}
                initialItems={initialItems}
            />
        </div>
    );
}