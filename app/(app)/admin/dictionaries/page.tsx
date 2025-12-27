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

// --- CẬP NHẬT PHẦN NÀY ---
export default async function DictionaryManagementPage({
    searchParams,
}: {
    // 1. Cập nhật Type: searchParams là Promise
    searchParams: Promise<{ category?: string }>;
}) {
    const supabase = await createSupabaseServerClient();

    // 2. Cập nhật Logic: Phải await trước khi lấy dữ liệu
    const { category: selectedCategory } = await searchParams;

    // ... (Phần code bên dưới giữ nguyên) ...
    const { data: allItems } = await supabase
        .from("sys_dictionaries")
        .select("category")
        .order("category");

    const categories = Array.from(new Set(allItems?.map(i => i.category) || []));

    let query = supabase
        .from("sys_dictionaries")
        .select("*")
        .order("sort_order", { ascending: true });

    if (selectedCategory) {
        query = query.eq("category", selectedCategory);
    }

    const { data: dictionaries } = await query;

    return (
        <div className="flex h-[calc(100vh-80px)] w-full gap-6 p-6">

            {/* --- SIDEBAR FILTER --- */}
            <div className="w-64 flex-shrink-0 border-r pr-6">
                <div className="mb-4">
                    <h2 className="text-lg font-bold">Phân hệ</h2>
                    <p className="text-sm text-gray-500">Lọc dữ liệu theo loại</p>
                </div>
                <ScrollArea className="h-full">
                    <div className="flex flex-col gap-1">
                        <Link
                            href="/admin/dictionaries"
                            className={cn(
                                "px-3 py-2 text-sm rounded-md transition-colors",
                                !selectedCategory ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-600"
                            )}
                        >
                            Tất cả
                        </Link>
                        {categories.map((cat) => (
                            <Link
                                key={cat}
                                href={`/admin/dictionaries?category=${cat}`}
                                className={cn(
                                    "px-3 py-2 text-sm rounded-md transition-colors truncate",
                                    selectedCategory === cat ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-600"
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
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Từ điển dữ liệu</h1>
                        <p className="text-muted-foreground">
                            {selectedCategory ? `Đang xem: ${selectedCategory}` : "Tất cả danh mục hệ thống"}
                        </p>
                    </div>
                    {/* Truyền selectedCategory vào để khi ấn thêm mới nó tự điền */}
                    <DictionaryDialog
                        defaultCategory={selectedCategory}
                        existingCategories={categories} // <--- MỚI
                    />
                </div>

                <div className="border rounded-md overflow-hidden bg-white shadow-sm flex-1 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 border-b font-medium">
                            <tr>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Tên hiển thị</th>
                                <th className="px-4 py-3">Badge</th>
                                <th className="px-4 py-3">Meta Data</th>
                                <th className="px-4 py-3 w-[100px] text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {dictionaries?.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-medium text-gray-500">{item.category}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{item.code}</td>
                                    <td className="px-4 py-3 font-semibold">{item.name}</td>
                                    <td className="px-4 py-3">
                                        <Badge className={cn("bg-gray-500", item.color && `bg-${item.color}-500`)}>
                                            {item.color || "default"}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 max-w-[200px] truncate font-mono text-xs text-gray-400">
                                        {JSON.stringify(item.meta_data)}
                                    </td>
                                    <td className="px-4 py-3 text-right flex justify-end items-center gap-1">
                                        <DictionaryDialog
                                            initialData={item}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                        <DeleteButton id={item.id} />
                                    </td>
                                </tr>
                            ))}
                            {dictionaries?.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-gray-500">
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