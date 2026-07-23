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

// --- Hàm chuyển đổi tên màu Tailwind sang Class nền ---
const getColorClass = (colorName: string | null) => {
    const colorMap: Record<string, string> = {
        slate: "bg-slate-500",
        blue: "bg-blue-500",
        emerald: "bg-emerald-500",
        amber: "bg-amber-500",
        purple: "bg-purple-500",
        indigo: "bg-indigo-500",
        rose: "bg-rose-500",
    };
    return colorMap[colorName || "slate"] || "bg-slate-500";
};

// --- Delete Button ---
function DeleteButton({ id }: { id: string }) {
    return (
        <form action={async () => {
            "use server";
            await deleteDictionary(id);
        }}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30">
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
        <div className="flex h-[calc(100vh-80px)] w-full gap-6 bg-slate-50 p-4 transition-colors duration-500 md:p-6 dark:bg-slate-950">

            {/* --- SIDEBAR --- */}
            <div className="flex w-72 flex-shrink-0 flex-col rounded-l-xl border-r bg-white py-6 pr-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-6 px-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-red-700 dark:text-red-500">
                        <Database className="h-5 w-5" /> Admin Area
                    </h2>
                    <p className="mt-1 text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">Từ điển & Tham số</p>
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
                            <FolderCog className="h-4 w-4" />
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
                                    {selectedCategory === cat.code && <BookOpen className="h-3.5 w-3.5" />}
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
            <div className="flex flex-1 flex-col overflow-hidden rounded-r-xl border bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
                <div className="z-20 flex flex-col justify-between gap-4 border-b bg-white p-6 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-800 transition-colors dark:text-slate-100">
                            {currentCatInfo ? currentCatInfo.name : "Dữ liệu nguồn hệ thống"}
                            {currentCatInfo && (
                                <Badge variant="outline" className="border-slate-200 bg-slate-50 font-mono font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                                    {currentCatInfo.code}
                                </Badge>
                            )}
                        </h1>
                        <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
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
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="sticky top-0 z-10 border-b bg-slate-50 text-slate-600 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                            <tr>
                                <th className="w-[160px] px-6 py-4 font-bold tracking-wider text-[11px] uppercase">Mã định danh (Code)</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-[11px] uppercase">Tên hiển thị</th>
                                <th className="w-[140px] px-6 py-4 font-bold tracking-wider text-[11px] uppercase">Màu sắc</th>
                                {!selectedCategory && <th className="px-6 py-4 font-bold tracking-wider text-[11px] uppercase">Thuộc Phân hệ</th>}
                                <th className="px-6 py-4 font-bold tracking-wider text-[11px] uppercase">Cấu hình Meta</th>
                                <th className="w-[100px] px-6 py-4 text-right font-bold tracking-wider text-[11px] uppercase">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800">
                            {dictionaries?.map((item) => (
                                <tr key={item.id} className="group border-none transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-900/10">
                                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{item.code}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800 transition-colors dark:text-slate-200">{item.name}</td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {/* ✅ ĐÃ FIX: Chuyển style={{ backgroundColor }} thành className bg-... */}
                                            <div
                                                className={cn("w-3 h-3 rounded-full shadow-sm ring-1 ring-black/5", getColorClass(item.color))}
                                            />
                                            <span className="font-mono text-xs text-slate-400 uppercase">{item.color || "slate"}</span>
                                        </div>
                                    </td>

                                    {!selectedCategory && (
                                        <td className="px-6 py-4">
                                            <Badge variant="secondary" className="border-none font-bold text-[10px] uppercase dark:bg-slate-800 dark:text-slate-300">
                                                {categories?.find(c => c.code === item.category)?.name || item.category}
                                            </Badge>
                                        </td>
                                    )}

                                    <td className="max-w-[200px] truncate px-6 py-4 font-mono text-[11px] text-slate-400 transition-colors dark:text-slate-500">
                                        {item.meta_data && Object.keys(item.meta_data).length > 0
                                            ? JSON.stringify(item.meta_data)
                                            : "---"}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            <DictionaryDialog
                                                initialData={item}
                                                existingCategories={categories || []}
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30">
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
                                    <td colSpan={6} className="py-24 text-center text-slate-400 italic dark:text-slate-600">
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