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
    documents: DocumentData[];
}

export default function ProjectDocumentsTab({ projectId, documents }: ProjectDocumentsTabProps) {

    return (
        // Card tự động support dark mode
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">Tài liệu dự án</CardTitle>
                <DocumentUploadModal projectId={projectId} />
            </CardHeader>
            <CardContent>
                {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có tài liệu nào. Nhấn nút "Tải lên" để thêm mới.</p>
                ) : (
                    <ul className="space-y-4 mt-4">
                        {documents.map((doc) => (
                            // ✅ FIX: border-b -> border-border (viền tối màu)
                            <li key={doc.id} className="flex items-center justify-between border-b border-border pb-3 last:border-b-0">
                                <div className="flex items-center gap-3 flex-grow min-w-0">
                                    {getIcon(doc.type)}
                                    <div className="flex-grow min-w-0">
                                        {/* ✅ FIX: text-blue-600 -> dark:text-blue-400 */}
                                        <Link href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium block truncate dark:text-blue-400">
                                            {doc.name}
                                        </Link>
                                        {/* ✅ FIX: text-gray-500 -> text-muted-foreground */}
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            Tải lên bởi {doc.uploaded_by?.name || 'N/A'} • {formatDate(doc.uploaded_at)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-1 flex-shrink-0 ml-4">
                                    <DocumentEditModal document={doc} />
                                    <DocumentDeleteButton
                                        documentId={doc.id}
                                        projectId={doc.project_id}
                                    />
                                </div>
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
        // ✅ FIX: Màu icon sáng hơn trong dark mode
        case "pdf": return <FileText className="w-5 h-5 text-red-500 dark:text-red-400" />;
        case "jpg":
        case "jpeg":
        case "png":
            return <ImageIcon className="w-5 h-5 text-green-500 dark:text-green-400" />;
        case "doc":
        case "docx":
            return <FileIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
        default: return <FileIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />;
    }
}