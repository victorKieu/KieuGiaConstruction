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

// Component nút xóa (Client Component nhúng trong Server Page)
function DeleteButton({ code }: { code: string }) {
    return (
        <form action={async () => {
            "use server";
            await deleteCategory(code);
        }}>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                type="submit"
            >
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
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-500">

            {/* Header & Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/admin/dictionaries/system">
                            <Button variant="ghost" size="sm" className="-ml-2 text-slate-500 dark:text-slate-400 dark:hover:bg-slate-900">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại Từ điển
                            </Button>
                        </Link>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <Database className="w-8 h-8 text-blue-600 dark:text-blue-500" /> Quản lý Phân hệ (Categories)
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
                        Định nghĩa các nhóm dữ liệu dùng chung cho toàn hệ thống.
                    </p>
                </div>
                <div className="w-full sm:w-auto">
                    <CategoryDialog />
                </div>
            </div>

            {/* Danh sách */}
            <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden transition-colors">
                <CardHeader className="pb-4 bg-slate-50/50 dark:bg-slate-950/50 border-b dark:border-slate-800">
                    <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">
                        Danh sách Phân hệ ({categories?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800">
                                    <TableHead className="w-[80px] text-center font-bold text-slate-700 dark:text-slate-300">Thứ tự</TableHead>
                                    <TableHead className="w-[180px] font-bold text-slate-700 dark:text-slate-300">Mã Code</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Tên hiển thị</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Mô tả</TableHead>
                                    <TableHead className="text-right w-[120px] font-bold text-slate-700 dark:text-slate-300 px-6">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {categories?.map((cat) => (
                                    <TableRow key={cat.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-none">
                                        <TableCell className="font-bold text-slate-500 dark:text-slate-400 text-center">
                                            {cat.sort_order}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 shadow-sm">
                                                {cat.code}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-800 dark:text-slate-200 text-base">
                                            {cat.name}
                                        </TableCell>
                                        <TableCell className="text-slate-500 dark:text-slate-400 text-sm max-w-[300px] truncate">
                                            {cat.description || <span className="text-slate-300 dark:text-slate-700 italic">-</span>}
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <div className="flex justify-end gap-1">
                                                <CategoryDialog
                                                    initialData={cat}
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                                        >
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
                                        <TableCell colSpan={5} className="text-center py-16 text-slate-500 dark:text-slate-400 italic">
                                            Chưa có phân hệ nào được tạo.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}