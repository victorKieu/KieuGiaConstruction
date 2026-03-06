"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import SurveyCreateModal from "../survey/SurveyCreateModal";
import SurveyWorkspaceModal from "../survey/SurveyWorkspaceModal";
import SurveyDeleteButton from "../survey/SurveyDeleteButton";
import { Survey, SurveyTaskTemplate, MemberData, ProjectData } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import SurveyEditModal from "../survey/SurveyEditModal";
import { Compass, Ruler, Camera } from "lucide-react";

// ✅ ĐÃ SỬA: Bỏ dấu '?' để ép kiểu dữ liệu bắt buộc là string, 
// khớp với kiểu mà component con đang mong đợi.
interface LocalSysDictionary {
    code: string;
    name: string;
    value: string;
}

interface ProjectSurveyTabProps {
    projectId: string;
    project: ProjectData;
    surveys: Survey[];
    members: MemberData[];
    surveyTypes: LocalSysDictionary[]; // ✅ Đổi tên interface để tránh trùng lặp hệ thống
    surveyTaskTemplates?: any[];
}

export default function ProjectSurveyTab({
    projectId,
    project,
    surveys: initialSurveys = [],
    members = [],
    surveyTypes = [],
    surveyTaskTemplates = []
}: ProjectSurveyTabProps) {
    // ✅ 1. Dùng State nội bộ để giao diện đổi màu lập tức
    const [surveys, setSurveys] = useState(initialSurveys);

    // ✅ 2. Đồng bộ nếu Server trả data mới về
    useEffect(() => {
        setSurveys(initialSurveys);
    }, [initialSurveys]);

    // ✅ 3. Hàm "Bắt sóng" từ Modal bên trong bắn ra
    const handleSurveyProgress = useCallback((surveyId: string, progress: number) => {
        setSurveys(prev => prev.map(s => {
            if (s.id === surveyId) {
                // Đạt 100% thì tự đổi chữ thành 'completed' ngay trên UI
                return { ...s, status: progress === 100 ? 'completed' : 'pending' };
            }
            return s;
        }));
    }, []);

    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b pb-4">
                <div>
                    <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <Ruler className="w-5 h-5 text-orange-500" /> Quản lý Đợt Khảo sát
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">Lập Workspace khảo sát theo từng giai đoạn từ Từ điển hệ thống</p>
                </div>
                <SurveyCreateModal projectId={projectId} surveyTypes={surveyTypes} />
            </CardHeader>

            <CardContent className="pt-6">
                {surveys.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed text-slate-400">
                        <Compass className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">Chưa có đợt khảo sát nào được khởi tạo.</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {surveys.map((survey) => (
                            <li key={survey.id} className="flex flex-col p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all hover:shadow-md">
                                <div className="flex justify-between items-center">
                                    <div className="flex-1 min-w-0 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <Camera className="w-5 h-5" />
                                        </div>
                                        <SurveyWorkspaceModal
                                            survey={survey}
                                            project={project}
                                            members={members}
                                            projectId={projectId}
                                            surveyTaskTemplates={surveyTaskTemplates}
                                            surveyTypes={surveyTypes}
                                            onProgressChange={handleSurveyProgress} // ✅ 4. TRUYỀN HÀM NÀY VÀO MODAL
                                        />
                                    </div>

                                    <div className="flex flex-shrink-0 items-center space-x-1 ml-4">
                                        <Badge className={`text-xs mr-3 ${survey.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} border-none shadow-none`}>
                                            {survey.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                                        </Badge>

                                        <SurveyEditModal survey={survey} projectId={projectId} />
                                        <SurveyDeleteButton surveyId={survey.id} projectId={projectId} />
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