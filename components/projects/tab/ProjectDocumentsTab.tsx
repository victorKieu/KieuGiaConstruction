import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/utils";
import { FileText, ImageIcon, FileIcon } from "lucide-react";

interface Document {
    id: string;
    name: string;
    type: string;
    url: string;
    uploaded_at: string;
    uploaded_by: {
        name: string;
    };
}

export default function ProjectDocumentsTab({ documents }: { documents: Document[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Tài liệu dự án</CardTitle>
            </CardHeader>
            <CardContent>
                {documents.length === 0 ? (
                    <p className="text-sm text-gray-500">Danh sách tài liệu sẽ được hiển thị ở đây.</p>
                ) : (
                    <ul className="space-y-4">
                        {documents.map((doc) => (
                            <li key={doc.id} className="flex items-center justify-between border-b pb-2">
                                <div className="flex items-center gap-3">
                                    {getIcon(doc.type)}
                                    <div>
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                                            {doc.name}
                                        </a>
                                        <div className="text-xs text-gray-500">
                                            Tải lên bởi {doc.uploaded_by.name} • {formatDate(doc.uploaded_at)}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function getIcon(type: string) {
    switch (type) {
        case "pdf": return <FileText className="w-5 h-5 text-red-500" />;
        case "image": return <ImageIcon className="w-5 h-5 text-green-500" />;
        case "doc": return <FileIcon className="w-5 h-5 text-blue-500" />;
        default: return <FileIcon className="w-5 h-5 text-gray-400" />;
    }
}