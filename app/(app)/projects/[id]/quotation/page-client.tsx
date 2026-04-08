"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft, FileSignature, FileText } from "lucide-react"
import QuotationList from "@/components/projects/quotation/quotation-list"
import { QuotationForm } from "@/components/projects/quotation/quotation-form"
import { ContractForm } from "@/components/projects/contract/contract-form"
import { getQuotationById } from "@/lib/action/quotationActions"
import { createContractFromQuotation } from "@/lib/action/contractActions"
import ContractList from "@/components/projects/contract/ContractList"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import { QuotationViewer } from "@/components/projects/quotation/quotation-viewer";
interface Props {
    projectId: string,
    project: any,
    quotations: any[],
    contracts?: any[]
}

type ViewMode = 'list' | 'quotation-form' | 'contract-form';

export default function QuotationPageClient({ projectId, project, quotations, contracts = [] }: Props) {
    const router = useRouter();
    const [viewQuotationData, setViewQuotationData] = useState<any>(null);
    const [view, setView] = useState<ViewMode>('list')
    const [editingData, setEditingData] = useState<any>(null)

    const [isPending, startTransition] = useTransition();

    // --- LOGIC BÁO GIÁ ---
    const handleCreateQuotation = () => {
        setEditingData(null)
        setView('quotation-form')
    }
    const handlePrintQuotation = async (quotation: any) => {
        // Vì ở danh sách chỉ có Header, ta cần gọi API lấy full items về để in
        const res = await getQuotationById(quotation.id);
        if (res.success) {
            setViewQuotationData(res.data); // Mở modal Viewer
        } else {
            alert("Lỗi tải chi tiết: " + res.error);
        }
    };
    const handleEditQuotation = async (quotation: any) => {
        const res = await getQuotationById(quotation.id)
        if (res.success) {
            setEditingData(res.data)
            setView('quotation-form')
        }
    }

    // --- LOGIC HỢP ĐỒNG ---
    const handleEditContract = (contract: any) => {
        setEditingData(contract)
        setView('contract-form')
    }

    const handleCreateContract = async (quoteId: string) => {
        if (!confirm("Hệ thống sẽ tạo Hợp đồng nháp dựa trên Báo giá này.\nBạn có muốn tiếp tục?")) return;

        startTransition(async () => {
            const res = await createContractFromQuotation(quoteId, projectId);
            if (res.success) {
                alert("Đã tạo hợp đồng thành công!");
                router.refresh();
            } else {
                alert("Lỗi: " + res.error);
            }
        });
    }

    // --- RENDER VIEW: QUOTATION FORM ---
    if (view === 'quotation-form') {
        return (
            <div className="animate-in slide-in-from-right duration-300 transition-colors">
                <div className="mb-4">
                    <Button variant="ghost" onClick={() => setView('list')} className="pl-0 hover:pl-2 transition-all dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-transparent">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
                    </Button>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100 transition-colors">
                        {editingData ? `Chỉnh sửa Báo giá` : "Tạo Báo Giá Mới"}
                    </h2>
                    <QuotationForm
                        projectId={projectId}
                        project={project}
                        initialData={editingData}
                        onSuccess={() => setView('list')}
                        onCancel={() => setView('list')}
                    />
                </div>
            </div>
        )
    }

    // --- RENDER VIEW: CONTRACT FORM ---
    if (view === 'contract-form') {
        return (
            <div className="animate-in slide-in-from-right duration-300 transition-colors">
                <div className="mb-4">
                    <Button variant="ghost" onClick={() => setView('list')} className="pl-0 hover:pl-2 transition-all dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-transparent">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
                    </Button>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <div className="flex items-center gap-2 mb-4 text-indigo-700 dark:text-indigo-400 border-b border-slate-200 dark:border-slate-800 pb-2 transition-colors">
                        <FileSignature className="w-6 h-6" />
                        <h2 className="text-xl font-bold">Chi tiết Hợp đồng</h2>
                    </div>
                    <ContractForm
                        projectId={projectId}
                        initialData={editingData}
                        onSuccess={() => setView('list')}
                        onCancel={() => setView('list')}
                        existingContracts={contracts}
                    />
                </div>
            </div>
        )
    }

    // --- RENDER VIEW: LIST ---
    return (
        <div className="space-y-8 animate-in fade-in duration-500 transition-colors">
            {/* PHẦN 1: HỢP ĐỒNG */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <FileSignature className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors">Hợp đồng Dự án</h3>
                </div>

                <ContractList
                    contracts={contracts}
                    projectId={projectId}
                    onViewDetail={handleEditContract}
                />
            </div>

            <Separator className="my-6 dark:bg-slate-800 transition-colors" />

            {/* PHẦN 2: BÁO GIÁ */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors">Danh sách Báo giá</h3>
                    </div>
                    <Button onClick={handleCreateQuotation} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo Báo Giá
                    </Button>
                </div>

                <QuotationList
                    quotations={quotations}
                    projectId={projectId}
                    onEdit={handleEditQuotation}
                    onCreateContract={handleCreateContract}
                    onPrint={handlePrintQuotation}
                />
                {/* ✅ NHÚNG MODAL QUOTATION VIEWER VÀO ĐÂY */}
                <QuotationViewer
                    quotation={viewQuotationData}
                    open={!!viewQuotationData}
                    onOpenChange={(open) => !open && setViewQuotationData(null)}
                />
            </div>
        </div>
    )
}