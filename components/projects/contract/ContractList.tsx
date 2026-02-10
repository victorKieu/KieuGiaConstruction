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
    onViewDetail?: (contract: any) => void;
}

export default function ContractList({ contracts, projectId, onViewDetail }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa hợp đồng này?")) return;

        startTransition(async () => {
            await deleteContract(id, projectId || 'crm');
            router.refresh();
        });
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contracts.map((contract) => (
                <Card
                    key={contract.id}
                    // ✅ FIX: bg-white -> bg-card, border-l colors adjusted for dark mode
                    className="hover:shadow-md transition-all border-l-4 border-l-indigo-600 dark:border-l-indigo-500 bg-card text-card-foreground group"
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            {/* ✅ FIX: text-gray-700 -> text-foreground */}
                            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                {/* ✅ FIX: Icon color for dark mode */}
                                <FileSignature className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                {contract.contract_number}
                            </CardTitle>
                            {/* ✅ FIX: text-gray-400 -> text-muted-foreground */}
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                                {contract.contract_type === 'service' ? 'HĐ Dịch vụ' : 'Hợp đồng'}
                            </p>
                        </div>
                        {contract.status === 'signed'
                            ? <Badge className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle className="w-3 h-3 mr-1" /> Đã ký</Badge>
                            // ✅ FIX: Badge style for dark mode
                            : <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80">Dự thảo</Badge>
                        }
                    </CardHeader>
                    <CardContent>
                        {/* ✅ FIX: text-indigo-700 -> dark:text-indigo-400 */}
                        <div className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mt-1 mb-3">
                            {formatCurrency(contract.value)}
                        </div>

                        {/* ✅ FIX: text-slate-500 -> text-muted-foreground */}
                        <div className="space-y-2 text-xs text-muted-foreground">
                            {/* ✅ FIX: border-b colors */}
                            <div className="flex justify-between border-b border-border pb-1">
                                <span>Ngày tạo:</span>
                                <span className="font-medium text-foreground">{new Date(contract.created_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div className="line-clamp-2 h-8 italic text-muted-foreground" title={contract.title}>
                                {contract.title}
                            </div>
                        </div>

                        {/* ✅ FIX: border-t colors */}
                        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center opacity-80 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 border-input bg-background hover:bg-accent hover:text-accent-foreground"
                                onClick={() => onViewDetail && onViewDetail(contract)}
                            >
                                Xem chi tiết
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                // ✅ FIX: Hover colors for dark mode (red background transparent)
                                className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
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