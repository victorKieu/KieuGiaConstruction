"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function AuditPrintButton({ audit, warehouse }: { audit: any, warehouse: any }) {
    return (
        <>
            <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> In phiếu kiểm kê
            </Button>

            {/* Template ẩn, chỉ hiện khi in */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-area, #printable-area * { visibility: visible; }
                    #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}</style>

            <div id="printable-area" className="hidden print:block p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold uppercase">Phiếu Kiểm Kê Vật Tư</h1>
                    <p>Kỳ: {audit.name} | Kho: {warehouse.name}</p>
                    <p>Ngày thực hiện: {new Date().toLocaleDateString('vi-VN')}</p>
                </div>

                <table className="w-full border-collapse border border-slate-400">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border border-slate-400 p-2">STT</th>
                            <th className="border border-slate-400 p-2 text-left">Tên vật tư</th>
                            <th className="border border-slate-400 p-2">ĐVT</th>
                            <th className="border border-slate-400 p-2">SL Sổ sách</th>
                            <th className="border border-slate-400 p-2">SL Kiểm đếm</th>
                            <th className="border border-slate-400 p-2">Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        {audit.items?.map((item: any, idx: number) => (
                            <tr key={item.id}>
                                <td className="border border-slate-400 p-2 text-center">{idx + 1}</td>
                                <td className="border border-slate-400 p-2">{item.item_name}</td>
                                <td className="border border-slate-400 p-2 text-center">{item.unit}</td>
                                <td className="border border-slate-400 p-2 text-center font-bold">{item.system_qty}</td>
                                <td className="border border-slate-400 p-2"></td>
                                <td className="border border-slate-400 p-2"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-12 flex justify-between px-8">
                    <div className="text-center"><p>Thủ kho</p><br /><br /><br /></div>
                    <div className="text-center"><p>Ban kiểm kê</p><br /><br /><br /></div>
                    <div className="text-center"><p>Kế toán kho</p><br /><br /><br /></div>
                </div>
            </div>
        </>
    );
}