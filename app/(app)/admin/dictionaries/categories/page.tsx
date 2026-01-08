import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/supabase/getUserProfile";
import { redirect } from "next/navigation";
import { CategoryDialog } from "@/components/admin/CategoryDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Database, ArrowLeft } from "lucide-react";
import { deleteCategory } from "@/lib/action/categoryActions";
import Link from "next/link";
import { toast } from "sonner"; // Lưu ý: Server Component không gọi toast trực tiếp, xử lý ở client (DeleteButton)

// Component nút xóa (Client Component nhúng trong Server Page)
function DeleteButton({ code }: { code: string }) {
    // Dùng form action để gọi server action
    return (
        <form action={async () => {
            "use server";
            await deleteCategory(code);
        }}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" type="submit">
                <Trash2 className="h-4 w-4" />
            </Button>
        </form>
    );
}

export default async function CategoriesPage() {
    // 1. Bảo mật
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) redirect("/dashboard");

    const supabase = await createSupabaseServerClient();

    // 2. Lấy danh sách Categories
    const { data: categories } = await supabase
        .from("sys_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50/50 min-h-screen">

            {/* Header & Navigation */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/admin/dictionaries/system">
                            <Button variant="ghost" size="sm" className="-ml-2 text-slate-500">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại Từ điển
                            </Button>
                        </Link>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Database className="w-8 h-8 text-blue-600" /> Quản lý Phân hệ (Categories)
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Định nghĩa các nhóm dữ liệu dùng chung cho toàn hệ thống.
                    </p>
                </div>
                <CategoryDialog />
            </div>

            {/* Danh sách */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Danh sách Phân hệ ({categories?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[100px]">Thứ tự</TableHead>
                                <TableHead className="w-[200px]">Mã Code</TableHead>
                                <TableHead>Tên hiển thị</TableHead>
                                <TableHead>Mô tả</TableHead>
                                <TableHead className="text-right w-[100px]">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories?.map((cat) => (
                                <TableRow key={cat.code} className="hover:bg-slate-50/50">
                                    <TableCell className="font-medium text-slate-500 text-center">
                                        {cat.sort_order}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono bg-slate-100 text-slate-700 border-slate-200">
                                            {cat.code}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold text-slate-800 text-base">
                                        {cat.name}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {cat.description || <span className="text-slate-300 italic">-</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <CategoryDialog
                                                initialData={cat}
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                }
                                            />
                                            <DeleteButton code={cat.code} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {categories?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        Chưa có phân hệ nào được tạo.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}