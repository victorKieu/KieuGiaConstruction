import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DictionaryDialog } from "@/components/admin/DictionaryDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { cn } from "@/lib/utils/utils";
import { Edit, Trash2 } from "lucide-react";
import { deleteDictionary } from "@/lib/action/dictionary";

// ... (Component DeleteButton giữ nguyên) ...
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

export default async function DictionaryManagementPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}) {
    const supabase = await createSupabaseServerClient();
    const { category: selectedCategory } = await searchParams;

    const { data: allItems } = await supabase
        .from("sys_dictionaries")
        .select("category")
        .order("category");

    const categories = Array.from(new Set(allItems?.map(i => i.category) || []));

    let query = supabase
        .from("sys_dictionaries")
        .select("*")
        .order("category", { ascending: true }) // Sắp xếp theo Category trước
        .order("sort_order", { ascending: true }); // Sau đó đến thứ tự

    if (selectedCategory) {
        query = query.eq("category", selectedCategory);
    }

    const { data: dictionaries } = await query;

    return (
        <div className="flex h-[calc(100vh-80px)] w-full gap-6 p-6 bg-slate-50/50">

            {/* --- SIDEBAR FILTER --- */}
            <div className="w-64 flex-shrink-0 border-r pr-6 bg-white rounded-l-lg py-4">
                <div className="mb-4 px-2">
                    <h2 className="text-lg font-bold">Phân hệ</h2>
                    <p className="text-sm text-gray-500">Lọc dữ liệu theo loại</p>
                </div>
                <ScrollArea className="h-[calc(100vh-200px)]">
                    <div className="flex flex-col gap-1 pr-3">
                        <Link
                            href="/admin/dictionaries"
                            className={cn(
                                "px-3 py-2 text-sm rounded-md transition-colors font-medium",
                                !selectedCategory ? "bg-slate-900 text-white shadow-md" : "hover:bg-slate-100 text-slate-600"
                            )}
                        >
                            Tất cả
                        </Link>
                        {categories.map((cat) => (
                            <Link
                                key={cat}
                                href={`/admin/dictionaries?category=${cat}`}
                                className={cn(
                                    "px-3 py-2 text-sm rounded-md transition-colors truncate block",
                                    selectedCategory === cat ? "bg-slate-900 text-white shadow-md" : "hover:bg-slate-100 text-slate-600"
                                )}
                                title={cat}
                            >
                                {cat}
                            </Link>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-r-lg shadow-sm border">
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Từ điển dữ liệu</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {selectedCategory ? `Đang xem danh mục: ${selectedCategory}` : "Quản lý toàn bộ danh mục hệ thống"}
                        </p>
                    </div>
                    <DictionaryDialog
                        defaultCategory={selectedCategory}
                        existingCategories={categories}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 border-b font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Code</th>
                                <th className="px-6 py-4">Tên hiển thị</th>
                                <th className="px-6 py-4">Màu sắc</th>
                                <th className="px-6 py-4">Ghi chú / Meta</th>
                                <th className="px-6 py-4 w-[100px] text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {dictionaries?.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-gray-500">{item.category}</td>
                                    <td className="px-6 py-4 font-mono text-xs bg-slate-50 rounded w-fit">{item.code}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-700">{item.name}</td>

                                    {/* 👇 SỬA PHẦN BADGE Ở ĐÂY */}
                                    <td className="px-6 py-4">
                                        <Badge
                                            variant="outline"
                                            className="text-white border-transparent shadow-sm"
                                            style={{
                                                // Dùng style inline để nhận mã HEX từ DB
                                                backgroundColor: item.color || "#94a3b8"
                                            }}
                                        >
                                            {item.color || "default"}
                                        </Badge>
                                    </td>

                                    <td className="px-6 py-4 max-w-[200px] truncate text-xs text-gray-400">
                                        {/* Hiển thị Meta Data gọn gàng hơn */}
                                        {item.meta_data && Object.keys(item.meta_data).length > 0
                                            ? <span title={JSON.stringify(item.meta_data)}>{JSON.stringify(item.meta_data)}</span>
                                            : <span className="text-gray-300">-</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <DictionaryDialog
                                                initialData={item}
                                                existingCategories={categories} // Nhớ truyền cái này vào dialog edit
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
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                                                <Edit className="h-6 w-6 text-gray-400" />
                                            </div>
                                            <p>Chưa có dữ liệu nào trong danh mục này.</p>
                                        </div>
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