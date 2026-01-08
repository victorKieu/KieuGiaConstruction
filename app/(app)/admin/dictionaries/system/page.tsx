import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DictionaryDialog } from "@/components/admin/DictionaryDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { cn } from "@/lib/utils/utils";
import { Edit, Trash2, Database, FolderCog, BookOpen } from "lucide-react";
import { deleteDictionary } from "@/lib/action/dictionaryActions";
import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/supabase/getUserProfile";

// --- Delete Button (Giữ nguyên) ---
function DeleteButton({ id }: { id: string }) {
    return (
        <form action={async () => {
            "use server";
            await deleteDictionary(id);
        }}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
            </Button>
        </form>
    )
}

export default async function DictionarySystemPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}) {
    // 1. Bảo mật
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) redirect("/dashboard");

    const supabase = await createSupabaseServerClient();
    const { category: selectedCategory } = await searchParams;

    // 2. Lấy Sidebar (sys_categories)
    const { data: categories } = await supabase
        .from("sys_categories")
        .select("*")
        .order("sort_order", { ascending: true });

    // 3. Lấy dữ liệu chính (sys_dictionaries)
    let query = supabase
        .from("sys_dictionaries")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("code", { ascending: true });

    // ✅ LOGIC FILTER: Nếu có chọn category thì lọc
    if (selectedCategory) {
        query = query.eq("category", selectedCategory);
    }

    const { data: dictionaries, error } = await query;

    // Debug log (Xem trong Terminal của VS Code)
    if (error) console.error("Query Error:", error);
    // console.log("Category đang chọn:", selectedCategory);
    // console.log("Số lượng tìm thấy:", dictionaries?.length);

    const currentCatInfo = categories?.find(c => c.code === selectedCategory);

    return (
        <div className="flex h-[calc(100vh-80px)] w-full gap-6 p-6 bg-slate-50/50">

            {/* --- SIDEBAR --- */}
            <div className="w-72 flex-shrink-0 border-r pr-6 bg-white rounded-l-lg py-4 flex flex-col">
                <div className="mb-4 px-2">
                    <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                        <Database className="w-5 h-5" /> Admin Area
                    </h2>
                    <p className="text-sm text-gray-500">Từ điển & Tham số</p>
                </div>

                <ScrollArea className="flex-1 pr-3">
                    <div className="flex flex-col gap-1">
                        {/* ✅ FIX LINK: Phải có /system */}
                        <Link
                            href="/admin/dictionaries/system"
                            className={cn(
                                "px-3 py-2 text-sm rounded-md transition-colors font-medium flex items-center gap-2",
                                !selectedCategory ? "bg-slate-900 text-white shadow-md" : "hover:bg-slate-100 text-slate-600"
                            )}
                        >
                            <FolderCog className="w-4 h-4" />
                            Tất cả
                        </Link>

                        <div className="my-2 border-t border-dashed" />

                        {categories?.map((cat) => (
                            // ✅ FIX LINK: Phải có /system ở trước ?category=...
                            <Link
                                key={cat.code}
                                href={`/admin/dictionaries/system?category=${cat.code}`}
                                className={cn(
                                    "px-3 py-2 text-sm rounded-md transition-colors block group relative",
                                    selectedCategory === cat.code ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-slate-100 text-slate-600"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate font-medium">{cat.name}</span>
                                    {selectedCategory === cat.code && <BookOpen className="w-3 h-3 text-blue-500" />}
                                </div>
                                <span className={cn("text-[10px] font-mono block truncate mt-0.5", selectedCategory === cat.code ? "text-blue-400" : "text-gray-400")}>
                                    {cat.code}
                                </span>
                            </Link>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-r-lg shadow-sm border">
                <div className="flex items-center justify-between p-6 border-b bg-white z-20">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                            {currentCatInfo ? currentCatInfo.name : "Dữ liệu nguồn"}
                            {currentCatInfo && <Badge variant="outline" className="font-mono font-normal text-slate-500">{currentCatInfo.code}</Badge>}
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {selectedCategory
                                ? "Quản lý danh sách giá trị trong phân hệ này"
                                : "Quản lý toàn bộ dữ liệu từ điển trong hệ thống"
                            }
                        </p>
                    </div>

                    {/* Dialog Thêm mới */}
                    <DictionaryDialog
                        defaultCategory={selectedCategory}
                        existingCategories={categories || []}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 border-b font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 w-[150px]">Code</th>
                                <th className="px-6 py-4">Tên hiển thị</th>
                                <th className="px-6 py-4">Màu sắc</th>
                                {!selectedCategory && <th className="px-6 py-4">Phân hệ</th>}
                                <th className="px-6 py-4">Meta Data</th>
                                <th className="px-6 py-4 w-[100px] text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {dictionaries?.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-600">{item.code}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-800">{item.name}</td>

                                    <td className="px-6 py-4">
                                        <Badge
                                            variant="outline"
                                            className="text-white border-transparent shadow-sm px-3"
                                            style={{ backgroundColor: item.color || "#94a3b8" }}
                                        >
                                            {item.color || "default"}
                                        </Badge>
                                    </td>

                                    {!selectedCategory && (
                                        <td className="px-6 py-4 text-xs">
                                            <Badge variant="secondary" className="font-normal text-slate-600 bg-slate-100">
                                                {/* Map ngược lại tên category */}
                                                {categories?.find(c => c.code === item.category)?.name || item.category}
                                            </Badge>
                                        </td>
                                    )}

                                    <td className="px-6 py-4 max-w-[200px] truncate text-xs text-gray-400 font-mono">
                                        {item.meta_data && Object.keys(item.meta_data).length > 0
                                            ? JSON.stringify(item.meta_data)
                                            : "-"}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <DictionaryDialog
                                                initialData={item}
                                                existingCategories={categories || []}
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                }
                                            />
                                            <DeleteButton id={item.id} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {dictionaries?.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 text-gray-500">
                                        Chưa có dữ liệu nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}