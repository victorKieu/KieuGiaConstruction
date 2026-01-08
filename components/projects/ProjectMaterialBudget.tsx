// components/projects/ProjectMaterialBudget.tsx
import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function ProjectMaterialBudget({ projectId }: { projectId: string }) {
    const supabase = await createClient();

    // Lấy dữ liệu Budget
    const { data: budget } = await supabase
        .from("project_material_budget")
        .select("*")
        .eq("project_id", projectId)
        .order("budget_quantity", { ascending: false }); // Ưu tiên vật tư khối lượng lớn

    if (!budget || budget.length === 0) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    Chưa có dữ liệu dự toán vật tư. Vui lòng thực hiện <b>Bóc tách khối lượng</b> và tính toán.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader><CardTitle>Tổng hợp nhu cầu Vật tư (Dự toán vs Thực tế)</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tên Vật tư</TableHead>
                            <TableHead className="text-center">ĐVT</TableHead>
                            <TableHead className="text-right">Định mức cho phép</TableHead>
                            <TableHead className="text-right">Đã yêu cầu</TableHead>
                            <TableHead className="text-right">Đã duyệt</TableHead>
                            <TableHead className="w-[200px]">Tiến độ sử dụng</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {budget.map((item) => {
                            // Tính % đã dùng
                            const percent = item.budget_quantity > 0
                                ? (item.requested_quantity / item.budget_quantity) * 100
                                : 0;

                            // Cảnh báo nếu vượt 100%
                            const isOverBudget = percent > 100;

                            return (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.material_name}</TableCell>
                                    <TableCell className="text-center">{item.unit}</TableCell>
                                    <TableCell className="text-right font-bold text-blue-600">
                                        {Number(item.budget_quantity).toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {Number(item.requested_quantity).toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell className="text-right text-green-600">
                                        {Number(item.approved_quantity).toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <Progress
                                                value={Math.min(percent, 100)}
                                                className={`h-2 ${isOverBudget ? "bg-red-100" : ""}`}
                                            // Note: Custom color cho progress bar cần class riêng hoặc style inline
                                            />
                                            <div className={`text-xs text-right ${isOverBudget ? "text-red-600 font-bold" : "text-slate-500"}`}>
                                                {percent.toFixed(1)}% {isOverBudget && "(VƯỢT)"}
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}