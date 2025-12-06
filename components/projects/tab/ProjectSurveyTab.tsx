"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import SurveyCreateModal from "../survey/SurveyCreateModal";
import SurveyDetailModal from "../survey/SurveyDetailModal";
import SurveyDeleteButton from "../survey/SurveyDeleteButton";
import { MemberData } from "@/types/project";
import type { Survey, SurveyTemplate, SurveyTaskTemplate } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import SurveyEditModal from "../survey/SurveyEditModal"; // Import Modal Sửa Đợt Khảo sát

interface ProjectSurveyTabProps {
    projectId: string;
    surveys: Survey[];
    members: MemberData[];
    surveyTemplates: SurveyTemplate[];
    surveyTaskTemplates: SurveyTaskTemplate[];
}

export default function ProjectSurveyTab({ projectId, surveys, members, surveyTemplates, surveyTaskTemplates }: ProjectSurveyTabProps) {
    return (
        // --- KHỐI CARD CHÍNH (ĐÚNG) ---
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                {/* Tiêu đề sẽ chỉ hiển thị 1 lần */}
                <CardTitle className="text-lg font-semibold">Các đợt Khảo sát ({surveys.length})</CardTitle>
                <SurveyCreateModal projectId={projectId} surveyTemplates={surveyTemplates} />
            </CardHeader>
            <CardContent>
                {surveys.length === 0 ? (
                    <p className="text-sm text-gray-500">Chưa có đợt khảo sát nào. Nhấn nút để tạo mới.</p>
                ) : (
                    <ul className="space-y-1 mt-4">
                        {surveys.map((survey) => (
                            // Mỗi <li> là một Đợt Khảo sát
                            <li key={survey.id} className="flex items-center justify-between border-b last:border-b-0 hover:bg-gray-50 rounded-md px-3 py-2">

                                {/* 1. Phần Modal Chi tiết (Clickable) */}
                                <div className="flex-grow">
                                    <SurveyDetailModal
                                        survey={survey}
                                        members={members}
                                        projectId={projectId}
                                        surveyTaskTemplates={surveyTaskTemplates}
                                    />
                                </div>

                                {/* 2. Phần Status và Nút Sửa/Xóa (Tách biệt) */}
                                <div className="flex flex-shrink-0 items-center space-x-1 ml-4">
                                    <Badge className="text-xs" variant="outline">
                                        {survey.status}
                                    </Badge>

                                    {/* Nút SỬA */}
                                    <SurveyEditModal
                                        survey={survey}
                                        projectId={projectId}
                                    />

                                    {/* Nút XÓA */}
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
        // --- KẾT THÚC KHỐI CARD CHÍNH ---
    );
}