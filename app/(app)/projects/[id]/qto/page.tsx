import { getProjectQTO } from "@/lib/action/qtoActions";
import { getNorms } from "@/lib/action/normActions";
import QTOClient from "@/components/projects/qto/QTOClient";

// Props cho Page
interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function QTOPage({ params }: PageProps) {
    const { id } = await params;

    // Fetch dữ liệu song song để tối ưu tốc độ
    const [qtoItems, norms] = await Promise.all([
        getProjectQTO(id), // Lấy danh sách đã bóc tách của dự án
        getNorms()         // Lấy thư viện định mức để user chọn
    ]);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2 mb-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800">Bóc tách khối lượng</h2>
                    <p className="text-muted-foreground">
                        Nhập khối lượng chi tiết theo định mức để hệ thống tự động tính toán vật tư.
                    </p>
                </div>
            </div>

            {/* Client Component xử lý giao diện nhập liệu */}
            <QTOClient
                projectId={id}
                items={qtoItems}
                norms={norms}
            />
        </div>
    );
}