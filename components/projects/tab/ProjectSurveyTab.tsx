"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import SurveyCreateModal from "../survey/SurveyCreateModal";
import SurveyDetailModal from "../survey/SurveyDetailModal"; // ✅ THÊM IMPORT NÀY
import SurveyDeleteButton from "../survey/SurveyDeleteButton";
import { MemberData } from "@/types/project"; // ✅ THÊM IMPORT NÀY
import type { Survey, SurveyTemplate, SurveyTaskTemplate } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import SurveyEditModal from "../survey/SurveyEditModal";

interface ProjectSurveyTabProps {
    projectId: string;
    surveys: Survey[];
    members: MemberData[];
    surveyTemplates: SurveyTemplate[];
    surveyTaskTemplates: SurveyTaskTemplate[];
}

export default function ProjectSurveyTab({ projectId, surveys, members, surveyTemplates, surveyTaskTemplates }: ProjectSurveyTabProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">Các đợt Khảo sát ({surveys.length})</CardTitle>
                <SurveyCreateModal projectId={projectId} surveyTemplates={surveyTemplates} />
            </CardHeader>
            <CardContent>
                {surveys.length === 0 ? (
                    <p className="text-sm text-gray-500">Chưa có đợt khảo sát nào. Nhấn nút để tạo mới.</p>
                ) : (
                    <ul className="space-y-1 mt-4">
                        {surveys.map((survey) => (
                            // --- PHẦN FIX: Thay thế <li> bằng Modal ---
                            <li key={survey.id} className="flex items-center justify-between border-b last:border-b-0 hover:bg-gray-50 rounded-md px-3 py-2">

                                {/* 1. Phần Clickable (Modal Trigger) (đã sửa ở Bước 1) */}
                                <div className="flex-grow">
                                    <SurveyDetailModal
                                        survey={survey}
                                        members={members}
                                        projectId={projectId}
                                        surveyTaskTemplates={surveyTaskTemplates}
                                    />
                                </div>

                                {/* 2. Phần Status và Nút Xóa (Tách biệt) */}
                                <div className="flex flex-shrink-0 items-center space-x-1 ml-4">
                                    <Badge className="text-xs" variant="outline">
                                        {survey.status}
                                    </Badge>

                                    {/* ✅ THÊM NÚT SỬA */}
                                    <SurveyEditModal
                                        survey={survey}
                                        projectId={projectId}
                                    />

                                    <SurveyDeleteButton
                                        surveyId={survey.id}
                                        projectId={projectId}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}