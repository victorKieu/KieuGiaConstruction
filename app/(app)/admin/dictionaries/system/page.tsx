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

// --- Delete Button ---
function DeleteButton({ id }: { id: string }) {
    return (
        <form action={async () => {
            "use server";
            await deleteDictionary(id);
        }}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
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

    if (selectedCategory) {
        query = query.eq("category", selectedCategory);
    }

    const { data: dictionaries, error } = await query;
    if (error) console.error("Query Error:", error);

    const currentCatInfo = categories?.find(c => c.code === selectedCategory);

    return (
        <div className="flex h-[calc(100vh-80px)] w-full gap-6 p-4 md:p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">

            {/* --- SIDEBAR --- */}
            <div className="w-72 flex-shrink-0 border-r dark:border-slate-800 pr-6 bg-white dark:bg-slate-900 rounded-l-xl py-6 flex flex-col transition-colors shadow-sm">
                <div className="mb-6 px-4">
                    <h2 className="text-lg font-bold text-red-700 dark:text-red-500 flex items-center gap-2">
                        <Database className="w-5 h-5" /> Admin Area
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-bold">Từ điển & Tham số</p>
                </div>

                <ScrollArea className="flex-1 px-2">
                    <div className="flex flex-col gap-1.5">
                        <Link
                            href="/admin/dictionaries/system"
                            className={cn(
                                "px-4 py-2.5 text-sm rounded-lg transition-all font-bold flex items-center gap-2.5",
                                !selectedCategory
                                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                            )}
                        >
                            <FolderCog className="w-4 h-4" />
                            Tất cả phân hệ
                        </Link>

                        <div className="my-3 border-t border-dashed dark:border-slate-800" />

                        {categories?.map((cat) => (
                            <Link
                                key={cat.code}
                                href={`/admin/dictionaries/system?category=${cat.code}`}
                                className={cn(
                                    "px-4 py-2.5 text-sm rounded-lg transition-all block group relative",
                                    selectedCategory === cat.code
                                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-900/50"
                                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate">{cat.name}</span>
                                    {selectedCategory === cat.code && <BookOpen className="w-3.5 h-3.5" />}
                                </div>
                                <span className={cn(
                                    "text-[10px] font-mono block truncate mt-1 opacity-70",
                                    selectedCategory === cat.code ? "text-blue-500" : "text-slate-400"
                                )}>
                                    {cat.code}
                                </span>
                            </Link>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-r-xl shadow-sm border dark:border-slate-800 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b dark:border-slate-800 bg-white dark:bg-slate-900 z-20 gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3 transition-colors">
                            {currentCatInfo ? currentCatInfo.name : "Dữ liệu nguồn hệ thống"}
                            {currentCatInfo && (
                                <Badge variant="outline" className="font-mono font-bold bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800">
                                    {currentCatInfo.code}
                                </Badge>
                            )}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 font-medium">
                            {selectedCategory
                                ? "Quản lý các hằng số và giá trị cấu hình cho phân hệ này."
                                : "Tổng hợp toàn bộ danh mục dữ liệu dùng chung trên toàn ứng dụng."
                            }
                        </p>
                    </div>

                    <DictionaryDialog
                        defaultCategory={selectedCategory}
                        existingCategories={categories || []}
                    />
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b dark:border-slate-800 sticky top-0 z-10 shadow-sm transition-colors">
                            <tr>
                                <th className="px-6 py-4 w-[160px] font-bold uppercase tracking-wider text-[11px]">Mã định danh (Code)</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Tên hiển thị</th>
                                <th className="px-6 py-4 w-[140px] font-bold uppercase tracking-wider text-[11px]">Màu sắc</th>
                                {!selectedCategory && <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Thuộc Phân hệ</th>}
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Cấu hình Meta</th>
                                <th className="px-6 py-4 w-[100px] text-right font-bold uppercase tracking-wider text-[11px]">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800">
                            {dictionaries?.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors group border-none">
                                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{item.code}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 transition-colors">{item.name}</td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full shadow-sm ring-1 ring-black/5"
                                                style={{ backgroundColor: item.color || "#94a3b8" }}
                                            />
                                            <span className="text-xs font-mono text-slate-400 uppercase">{item.color || "n/a"}</span>
                                        </div>
                                    </td>

                                    {!selectedCategory && (
                                        <td className="px-6 py-4">
                                            <Badge variant="secondary" className="font-bold text-[10px] uppercase dark:bg-slate-800 dark:text-slate-300 border-none">
                                                {categories?.find(c => c.code === item.category)?.name || item.category}
                                            </Badge>
                                        </td>
                                    )}

                                    <td className="px-6 py-4 max-w-[200px] truncate text-[11px] text-slate-400 dark:text-slate-500 font-mono transition-colors">
                                        {item.meta_data && Object.keys(item.meta_data).length > 0
                                            ? JSON.stringify(item.meta_data)
                                            : "---"}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <DictionaryDialog
                                                initialData={item}
                                                existingCategories={categories || []}
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30">
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
                                    <td colSpan={6} className="text-center py-24 text-slate-400 dark:text-slate-600 italic">
                                        Không tìm thấy dữ liệu từ điển nào.
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