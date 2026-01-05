import { Construction } from "lucide-react";

export default function UnderConstructionPage() {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] p-4 bg-slate-50/50">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-md mx-auto animate-in fade-in zoom-in duration-500">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Construction className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                    Tính năng đang phát triển
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                    Chúng tôi đang xây dựng chức năng này.
                    Vui lòng quay lại sau hoặc liên hệ quản trị viên để biết thêm chi tiết.
                </p>
            </div>
        </div>
    );
}