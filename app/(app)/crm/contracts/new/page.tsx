import { createClient } from "@/lib/supabase/server";
import { ContractForm } from "@/components/crm/contracts/contract-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic"; // Đảm bảo luôn lấy danh sách khách hàng mới nhất

export default async function NewContractPage() {
    // 1. Khởi tạo Supabase Client
    const supabase = await createClient();

    // 2. Lấy danh sách khách hàng (Chỉ lấy active) để nạp vào Dropdown
    const { data: customers, error } = await supabase
        .from("customers")
        .select("id, name, type, contact_person, title, tax_code, address, phone, email")
        .eq("status", "active")
        .order("name", { ascending: true });

    if (error) {
        console.error("Lỗi tải danh sách khách hàng:", error);
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            {/* Header & Nut Back */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/crm/contracts">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Tạo hợp đồng mới</h2>
                    <p className="text-muted-foreground">Thiết lập hồ sơ hợp đồng thi công/xây dựng mới.</p>
                </div>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* Cột chính: Form nhập liệu */}
                <Card className="lg:col-span-2 shadow-md">
                    <CardHeader className="bg-muted/20 pb-4">
                        <CardTitle className="text-xl text-primary">Thông tin hợp đồng</CardTitle>
                        <CardDescription>
                            Vui lòng điền đầy đủ các thông tin bắt buộc được đánh dấu (*).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {/* Truyền danh sách khách hàng vào Form */}
                        <ContractForm customers={customers || []} />
                    </CardContent>
                </Card>

                {/* Cột phụ: Hướng dẫn/Ghi chú */}
                <div className="space-y-6">
                    <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base text-blue-800 flex items-center gap-2">
                                ℹ️ Quy tắc đặt mã
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-blue-700 space-y-2">
                            <p>Hệ thống khuyến nghị định dạng mã hợp đồng:</p>
                            <div className="bg-white p-2 rounded border border-blue-200 font-mono font-bold text-center">
                                HĐ-[Năm]/KG-[Số thứ tự]
                            </div>
                            <p className="text-xs text-blue-600/80 italic mt-2">
                                Ví dụ: HĐ-2024/KG-001
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Lưu ý quan trọng</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <ul className="list-disc list-inside space-y-1">
                                <li>Giá trị hợp đồng nên nhập số nguyên (VNĐ).</li>
                                <li>Trạng thái mặc định là <strong>Bản nháp</strong>.</li>
                                <li>Sau khi tạo, bạn có thể tải lên file scan PDF ở trang chi tiết.</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}