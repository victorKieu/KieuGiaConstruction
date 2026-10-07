"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import SurveyCreateModal from "../survey/SurveyCreateModal";
import SurveyWorkspaceModal from "../survey/SurveyWorkspaceModal";
import SurveyDeleteButton from "../survey/SurveyDeleteButton";
import { Survey, MemberData, ProjectData } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import SurveyEditModal from "../survey/SurveyEditModal";
import { Compass, Ruler, Camera } from "lucide-react";

// Đã bỏ dấu '?' để ép kiểu dữ liệu bắt buộc là string
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
    surveyTypes: LocalSysDictionary[];
    surveyTaskTemplates?: any[];
    tasks?: any[]; // Danh sách WBS Tasks
}

export default function ProjectSurveyTab({
    projectId,
    project,
    surveys: initialSurveys = [],
    members = [],
    surveyTypes = [],
    surveyTaskTemplates = [],
    tasks = []
}: ProjectSurveyTabProps) {
    // 1. Dùng State nội bộ để giao diện đổi màu lập tức
    const [surveys, setSurveys] = useState(initialSurveys);

    // 2. Đồng bộ nếu Server trả data mới về
    useEffect(() => {
        setSurveys(initialSurveys);
    }, [initialSurveys]);

    // 3. Hàm "Bắt sóng" từ Modal bên trong bắn ra
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
        <Card className="border-slate-200 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 bg-slate-50 pb-4 transition-colors dark:border-slate-800 dark:bg-slate-950/50">
                <div>
                    <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-900 dark:text-blue-400">
                        <Ruler className="h-5 w-5 text-orange-500" /> Quản lý Đợt Khảo sát
                    </CardTitle>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Lập Workspace khảo sát theo từng giai đoạn từ Từ điển hệ thống</p>
                </div>
                <SurveyCreateModal
                    projectId={projectId}
                    surveyTypes={surveyTypes}
                    tasks={tasks}
                />
            </CardHeader>

            <CardContent className="pt-6">
                {surveys.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-slate-400 transition-colors dark:border-slate-800 dark:bg-slate-950/30">
                        <Compass className="mx-auto mb-3 h-10 w-10 opacity-20" />
                        <p className="text-sm font-medium">Chưa có đợt khảo sát nào được khởi tạo.</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {surveys.map((survey) => (
                            <li key={survey.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900">
                                <div className="flex items-center justify-between">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors dark:bg-blue-500/10 dark:text-blue-400">
                                            <Camera className="h-5 w-5" />
                                        </div>
                                        <SurveyWorkspaceModal
                                            survey={survey}
                                            project={project}
                                            members={members}
                                            projectId={projectId}
                                            surveyTaskTemplates={surveyTaskTemplates}
                                            surveyTypes={surveyTypes}
                                            onProgressChange={handleSurveyProgress}
                                        />
                                    </div>

                                    <div className="ml-4 flex flex-shrink-0 items-center space-x-1">
                                        <Badge className={`text-xs mr-3 border-none shadow-none transition-colors ${survey.status === 'completed'
                                            ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                                            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                            }`}>
                                            {survey.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                                        </Badge>

                                        <div className="flex items-center gap-1">
                                            <SurveyEditModal survey={survey} projectId={projectId} tasks={tasks} surveyTypes={surveyTypes} />
                                            <SurveyDeleteButton surveyId={survey.id} projectId={projectId} />
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