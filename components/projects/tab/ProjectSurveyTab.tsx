"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import SurveyCreateModal from "../survey/SurveyCreateModal";
import SurveyDetailModal from "../survey/SurveyDetailModal";
import SurveyDeleteButton from "../survey/SurveyDeleteButton";
import { MemberData } from "@/types/project";
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
                    <ul className="space-y-4 mt-4">
                        {surveys.map((survey) => (
                            <li key={survey.id} className="flex flex-col p-4 mb-2 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                {/* Hàng trên: Thông tin khảo sát và các nút thao tác */}
                                <div className="flex justify-between items-center mb-4">
                                    {/* 1. Phần Modal Chi Tiết Khảo sát */}
                                    <div className="flex-1 min-w-0 flex items-center gap-3">
                                        <SurveyDetailModal
                                            survey={survey}
                                            members={members}
                                            projectId={projectId}
                                            surveyTaskTemplates={surveyTaskTemplates}
                                        />
                                    </div>

                                    {/* 2. Phần Status và Nút Sửa/Xóa */}
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
                                </div>

                                
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}