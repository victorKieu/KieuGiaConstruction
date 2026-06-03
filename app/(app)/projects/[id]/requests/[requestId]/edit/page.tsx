"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import API Actions
import { updateMaterialRequestAction, getMaterialRequestById, getProjectWarehouses } from "@/lib/action/requestActions";
// Import API lấy danh mục vật tư dự toán
import { getProjectStandardizedMaterials } from "@/lib/action/procurement";

// ✅ GỌI COMPONENT FORM DÙNG CHUNG
import UnifiedRequestForm from "@/components/procurement/UnifiedRequestForm";

export default function EditRequestPage({ params }: { params: Promise<{ id: string; requestId: string }> }) {
    const { id: projectId, requestId } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [requestData, setRequestData] = useState<any>(null);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [budgetMaterials, setBudgetMaterials] = useState<any[]>([]);

    // 1. Load dữ liệu phiếu cũ, danh sách kho & vật tư dự toán
    useEffect(() => {
        const loadData = async () => {
            try {
                // Kéo song song 3 luồng dữ liệu để tối ưu tốc độ
                const [data, whList, budgetMats] = await Promise.all([
                    getMaterialRequestById(requestId),
                    getProjectWarehouses(projectId),
                    getProjectStandardizedMaterials(projectId)
                ]);

                setWarehouses(whList || []);
                setBudgetMaterials(budgetMats || []);

                if (data) {
                    // Ánh xạ (Map) dữ liệu DB cho khớp với cấu trúc Form
                    setRequestData({
                        code: data.code,
                        priority: data.priority === "medium" ? "normal" : (data.priority || "normal"),
                        deadline_date: data.deadline_date ? new Date(data.deadline_date).toISOString().split('T')[0] : "",
                        destination_warehouse_id: data.destination_warehouse_id || "",
                        notes: data.notes || "",
                        items: data.items.map((i: any) => ({
                            item_name: i.item_name,
                            item_category: i.item_category || "material",
                            // ✅ FIX EDIT: Chuyển thẳng thành String để Form hiển thị chuẩn số thập phân (VD: "0.5") mà không bị React báo lỗi
                            quantity: String(i.quantity),
                            unit: i.unit,
                            estimated_price: Number(i.estimated_price) || 0,
                            notes: i.notes || ""
                        }))
                    });
                } else {
                    toast.error("Không tìm thấy phiếu yêu cầu");
                    router.back();
                }
            } catch (error) {
                console.error(error);
                toast.error("Lỗi khi tải dữ liệu");
            } finally {
                setFetching(false);
            }
        };

        loadData();
    }, [requestId, projectId, router]);

    // 2. Xử lý khi bấm nút "Lưu Phiếu Yêu Cầu"
    const handleSubmit = async (formData: any) => {
        setLoading(true);

        // 🔥 CHUẨN HÓA SỐ LƯỢNG THÀNH FLOAT ĐỂ TRÁNH ZOD & DATABASE TỪ CHỐI KHI EDIT
        const formattedItems = formData.items.map((item: any) => ({
            ...item,
            quantity: Number(item.quantity) // Bắt buộc ép kiểu float (số thập phân) ở đây
        }));

        // ✅ CHUẨN HÓA DỮ LIỆU CHO KHỚP VỚI ZOD SCHEMA TRƯỚC KHI GỬI LÊN SERVER
        const payload = {
            ...formData,
            items: formattedItems, // Dùng mảng đã ép kiểu
            project_id: projectId,
            deadline_date: new Date(formData.deadline_date),
        };

        const res = await updateMaterialRequestAction(requestId, payload);
        setLoading(false);

        if (res.success) {
            toast.success("Cập nhật phiếu thành công!"); // ✅ Đổi câu thông báo cho hợp ngữ cảnh Edit
            router.push(`/projects/${projectId}/?tab=requests`);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    // Màn hình chờ khi đang kéo dữ liệu
    if (fetching) {
        return (
            <div className="p-12 flex justify-center items-center text-muted-foreground">
                <Loader2 className="animate-spin w-8 h-8 text-blue-600 mr-3" />
                Đang tải dữ liệu phiếu...
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 md:p-8 pt-6 max-w-5xl mx-auto animate-in fade-in duration-500">

            {/* Header Màn hình */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push(`/projects/${projectId}/?tab=requests`)} className="hover:bg-slate-200 dark:hover:bg-slate-800">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Chỉnh sửa Yêu cầu</h2>
                    <p className="text-muted-foreground text-sm">Cập nhật thông tin phiếu <span className="font-semibold">{requestData?.code}</span></p>
                </div>
            </div>

            {/* ✅ LÔI UNIFIED FORM RA XÀI */}
            {requestData && (
                <UnifiedRequestForm
                    initialData={requestData}       // Tự động fill data cũ
                    warehouses={warehouses}         // Đổ danh sách kho vào Select
                    budgetMaterials={budgetMaterials} // Đổ danh sách vật tư vào Combobox
                    isSubmitting={loading}          // Khóa nút khi đang lưu
                    onSubmit={handleSubmit}         // Hàm lưu data
                    onCancel={() => router.push(`/projects/${projectId}/?tab=requests`)}    // Hàm hủy
                />
            )}

        </div>
    );
}