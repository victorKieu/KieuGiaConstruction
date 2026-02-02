"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSignature, Trash2, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";
import { deleteContract } from "@/lib/action/contractActions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface Props {
    contracts: any[];
    projectId?: string;
    // ✅ Định nghĩa prop onViewDetail (có dấu ?)
    onViewDetail?: (contract: any) => void;
}

// ✅ QUAN TRỌNG: Phải lấy onViewDetail ra ở đây thì bên dưới mới dùng được
export default function ContractList({ contracts, projectId, onViewDetail }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa hợp đồng này?")) return;

        startTransition(async () => {
            // Nếu không có projectId (Trang CRM), ta truyền chuỗi rỗng hoặc xử lý logic xóa riêng
            // Nhưng action deleteContract hiện tại cần projectId để revalidate.
            // Tạm thời ta truyền projectId hoặc 'crm' để server không lỗi
            await deleteContract(id, projectId || 'crm');
            router.refresh();
        });
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contracts.map((contract) => (
                <Card key={contract.id} className="hover:shadow-md transition-all border-l-4 border-l-indigo-600 bg-white group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <FileSignature className="w-4 h-4 text-indigo-600" />
                                {contract.contract_number}
                            </CardTitle>
                            <p className="text-[10px] text-gray-400 uppercase font-semibold">
                                {contract.contract_type === 'service' ? 'HĐ Dịch vụ' : 'Hợp đồng'}
                            </p>
                        </div>
                        {contract.status === 'signed'
                            ? <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Đã ký</Badge>
                            : <Badge variant="secondary" className="bg-gray-100 text-gray-600">Dự thảo</Badge>
                        }
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-indigo-700 mt-1 mb-3">
                            {formatCurrency(contract.value)}
                        </div>

                        <div className="space-y-2 text-xs text-slate-500">
                            <div className="flex justify-between border-b pb-1">
                                <span>Ngày tạo:</span>
                                <span className="font-medium">{new Date(contract.created_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div className="line-clamp-2 h-8 italic text-slate-400" title={contract.title}>
                                {contract.title}
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t flex justify-between items-center opacity-80 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                // ✅ Giờ thì biến này đã được định nghĩa
                                onClick={() => onViewDetail && onViewDetail(contract)}
                            >
                                Xem chi tiết
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-300 hover:text-red-600 hover:bg-red-50"
                                disabled={isPending}
                                onClick={() => handleDelete(contract.id)}
                                title="Xóa hợp đồng"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}