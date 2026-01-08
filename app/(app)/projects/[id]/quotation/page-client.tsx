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

interface Props {
    projectId: string,
    project: any, // ✅ THÊM: Nhận object project để lấy tên & địa chỉ
    quotations: any[],
    contracts?: any[]
}

// Định nghĩa các chế độ view
type ViewMode = 'list' | 'quotation-form' | 'contract-form';

export default function QuotationPageClient({ projectId, project, quotations, contracts = [] }: Props) {
    const router = useRouter();

    const [view, setView] = useState<ViewMode>('list')
    const [editingData, setEditingData] = useState<any>(null)

    const [isPending, startTransition] = useTransition();

    // --- LOGIC BÁO GIÁ ---
    const handleCreateQuotation = () => {
        setEditingData(null)
        setView('quotation-form')
    }

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
            <div className="animate-in slide-in-from-right duration-300">
                <div className="mb-4">
                    <Button variant="ghost" onClick={() => setView('list')} className="pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
                    </Button>
                </div>
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h2 className="text-xl font-bold mb-4">
                        {editingData ? `Chỉnh sửa Báo giá` : "Tạo Báo Giá Mới"}
                    </h2>
                    <QuotationForm
                        projectId={projectId}
                        project={project} // ✅ TRUYỀN PROJECT XUỐNG FORM
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
            <div className="animate-in slide-in-from-right duration-300">
                <div className="mb-4">
                    <Button variant="ghost" onClick={() => setView('list')} className="pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
                    </Button>
                </div>
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-indigo-700 border-b pb-2">
                        <FileSignature className="w-6 h-6" />
                        <h2 className="text-xl font-bold">Chi tiết Hợp đồng</h2>
                    </div>
                    <ContractForm
                        projectId={projectId}
                        initialData={editingData}
                        onSuccess={() => setView('list')}
                        onCancel={() => setView('list')}
                    />
                </div>
            </div>
        )
    }

    // --- RENDER VIEW: LIST ---
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* PHẦN 1: HỢP ĐỒNG */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <FileSignature className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-800">Hợp đồng Dự án</h3>
                </div>

                <ContractList
                    contracts={contracts}
                    projectId={projectId}
                    onViewDetail={handleEditContract}
                />
            </div>

            <Separator className="my-6" />

            {/* PHẦN 2: BÁO GIÁ */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-orange-600" />
                        <h3 className="text-lg font-bold text-slate-800">Danh sách Báo giá</h3>
                    </div>
                    <Button onClick={handleCreateQuotation} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo Báo Giá
                    </Button>
                </div>

                <QuotationList
                    quotations={quotations}
                    projectId={projectId}
                    onEdit={handleEditQuotation}
                    onCreateContract={handleCreateContract}
                />
            </div>
        </div>
    )
}