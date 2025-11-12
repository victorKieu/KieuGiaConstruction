import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/utils";
import { FileText, ImageIcon, FileIcon } from "lucide-react";
import DocumentUploadModal from "../document/DocumentUploadModal";
import Link from 'next/link';
import DocumentEditModal from "../document/DocumentEditModal";
import DocumentDeleteButton from "../document/DocumentDeleteButton";
import { DocumentData } from "@/types/project";

interface ProjectDocumentsTabProps {
    projectId: string;
    documents: DocumentData[]; // <-- DÙNG TYPE THẬT
}
export default function ProjectDocumentsTab({ projectId, documents }: ProjectDocumentsTabProps) {

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">Tài liệu dự án</CardTitle>
                <DocumentUploadModal projectId={projectId} />
            </CardHeader>
            <CardContent>
                {documents.length === 0 ? (
                    <p className="text-sm text-gray-500">Chưa có tài liệu nào. Nhấn nút "Tải lên" để thêm mới.</p>
                ) : (
                    <ul className="space-y-4 mt-4">
                        {documents.map((doc) => (
                            <li key={doc.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                                <div className="flex items-center gap-3 flex-grow min-w-0"> {/* Thêm flex-grow và min-w-0 */}
                                    {getIcon(doc.type)}
                                    <div className="flex-grow min-w-0"> {/* Thêm flex-grow và min-w-0 */}
                                        {/* Sử dụng Link hoặc <a> */}
                                        <Link href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium block truncate">
                                            {doc.name}
                                        </Link>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            Tải lên bởi {doc.uploaded_by?.name || 'N/A'} • {formatDate(doc.uploaded_at)}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-1 flex-shrink-0 ml-4">
                                    {/* Nút Sửa */}
                                    <DocumentEditModal document={doc} />
                                    <DocumentDeleteButton
                                        documentId={doc.id}
                                        projectId={doc.project_id} // 'doc.project_id' giờ đã có giá trị
                                    />
                                </div>
                                {/* === KẾT THÚC SỬA === */}
                            </li >
                        ))
                        }
                    </ul >
                )}
            </CardContent >
        </Card >
    );
}

function getIcon(type: string) {
    switch (type) {
        case "pdf": return <FileText className="w-5 h-5 text-red-500" />;
        case "jpg":
        case "jpeg":
        case "png":
            return <ImageIcon className="w-5 h-5 text-green-500" />;
        case "doc":
        case "docx":
            return <FileIcon className="w-5 h-5 text-blue-500" />;
        default: return <FileIcon className="w-5 h-5 text-gray-400" />;
    }
}