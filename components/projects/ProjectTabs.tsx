"use client";

// --- PHẦN FIX: THÊM IMPORT ---
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
// --- KẾT THÚC FIX ---
import ProjectOverviewTab from "./tab/ProjectOverviewTab";
import ProjectMembersTab from "./tab/ProjectMembersTab";
import ProjectDocumentsTab from "./tab/ProjectDocumentsTab";
import ProjectFinanceTab from "./tab/ProjectFinanceTab";
import ProjectMilestoneTab from "./tab/ProjectMilestoneTab";
import ProjectSurveyTab from "./tab/ProjectSurveyTab";
import ProjectQtoTab from "./tab/ProjectQtoTab";
import ProjectEstimationTab from "./tab/ProjectEstimationTab";
// Import TẤT CẢ các type thật từ file chung
import {
    ProjectData,
    MilestoneData,
    MemberData,
    DocumentData,
    FinanceData,
    TaskData,
    Survey,
    SurveyTemplate,
    SurveyTaskTemplate,
    QtoItem,
    QtoTemplate
} from "@/types/project";
interface ProjectTabsProps {
    projectId: string;
    project: ProjectData;
    milestones: MilestoneData[];
    members: MemberData[];
    documents: DocumentData[];
    finance: FinanceData | null;
    tasks: TaskData[];
    surveys: Survey[];
    surveyTemplates: SurveyTemplate[];
    surveyTaskTemplates: SurveyTaskTemplate[];
    taskFeed: React.ReactNode;
    qtoItems: QtoItem[];
    qtoTemplates: QtoTemplate[];
    membersCount: number;
    documentsCount: number;
}

// Danh sách tab
const TABS = {
    OVERVIEW: "Tổng quan",
    TASKS: "Công việc & Mốc thời gian",
    SURVEY: "Khảo sát",
    MEMBERS: "Nhân sự",
    QTO: "Bóc tách Khối lượng", // ✅ THÊM TAB QTO
    ESTIMATION: "Dự toán", // ✅ THÊM TAB DỰ TOÁN
    DOCUMENTS: "Tài liệu",
    FINANCE: "Tài chính"
};
const tabs = Object.values(TABS);

// Hàm này sẽ đọc param ?tab=... từ URL và trả về tên Tab tương ứng
function getDefaultTabFromURL(searchParams: URLSearchParams | null): string {
    if (!searchParams) return TABS.OVERVIEW;

    const tabParam = searchParams.get("tab");

    switch (tabParam) {
        case "survey":
            return TABS.SURVEY;
        case "tasks":
            return TABS.TASKS;
        case "qto":
            return TABS.QTO;
        case "estimation":
            return TABS.ESTIMATION;
        case "members":
            return TABS.MEMBERS;
        case "documents":
            return TABS.DOCUMENTS;
        case "finance":
            return TABS.FINANCE;
        default:
            return TABS.OVERVIEW;
    }
}
// --- KẾT THÚC FIX ---


export default function ProjectTabs({
    projectId,
    project,
    milestones,
    members,
    documents,
    finance,
    tasks,
    surveys,
    surveyTemplates,
    surveyTaskTemplates,
    taskFeed,
    membersCount,
    documentsCount,
    qtoItems, // ✅ NHẬN PROPS
    qtoTemplates, // ✅ NHẬN PROPS
}: ProjectTabsProps) {

    // --- PHẦN FIX: ĐỌC TAB TỪ URL ---
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(() => getDefaultTabFromURL(searchParams));

    // (Tùy chọn: Thêm useEffect để theo dõi nếu URL thay đổi mà trang không tải lại)
    useEffect(() => {
        setActiveTab(getDefaultTabFromURL(searchParams));
    }, [searchParams]);
    // --- KẾT THÚC FIX ---

    return (
        <div className="w-full">
            {/* Navigations (giữ nguyên) */}
            <div className="flex gap-4 border-b mb-4 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2 border-b-2 whitespace-nowrap ${activeTab === tab
                                ? "border-blue-600 font-semibold text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content (Sử dụng TABS.NAME để code sạch hơn) */}
            {activeTab === TABS.OVERVIEW && (<ProjectOverviewTab project={project} milestones={milestones} />)}
            {activeTab === TABS.TASKS && (<ProjectMilestoneTab projectId={project.id} milestones={milestones} tasks={tasks} members={members} taskFeed={taskFeed} />)}
            {activeTab === TABS.SURVEY && (
                <ProjectSurveyTab
                    projectId={projectId}
                    surveys={surveys}
                    members={members}
                    surveyTemplates={surveyTemplates}
                    surveyTaskTemplates={surveyTaskTemplates}
                />
            )}
            {activeTab === TABS.MEMBERS && <ProjectMembersTab members={members} />}
            {/* (MỚI) Tab Bóc tách Khối lượng */}
            {activeTab === TABS.SURVEY && (
                <ProjectSurveyTab
                    projectId={projectId}
                    surveys={surveys}
                    members={members}
                    surveyTemplates={surveyTemplates}
                    surveyTaskTemplates={surveyTaskTemplates}
                />
            )}
            {activeTab === TABS.QTO && (
                <ProjectQtoTab
                    projectId={projectId}
                    qtoItems={qtoItems}
                    qtoTemplates={qtoTemplates}
                />
            )}
            {activeTab === TABS.DOCUMENTS && <ProjectDocumentsTab projectId={projectId} documents={documents} />}
            {activeTab === TABS.FINANCE && <ProjectFinanceTab finance={finance} />}
        </div>
    );
}