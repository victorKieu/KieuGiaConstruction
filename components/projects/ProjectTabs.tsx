"use client";

import { useState } from "react";
import ProjectOverviewTab from "./tab/ProjectOverviewTab";
import ProjectMembersTab from "./tab/ProjectMembersTab";
import ProjectDocumentsTab from "./tab/ProjectDocumentsTab";
import ProjectFinanceTab from "./tab/ProjectFinanceTab";
import ProjectMilestoneTab from "./tab/ProjectMilestoneTab";
import {
    ProjectData,
    MilestoneData,
    MemberData,
    DocumentData,
    FinanceData,
    TaskData,
    TaskFeedItem // ✅ ĐÃ THÊM TASKFEEDITEM TỪ types/project
} from "@/types/project";

// ❌ ĐÃ XÓA ĐỊNH NGHĨA TaskFeedItem CỤC BỘ

interface ProjectTabsProps {
    project: ProjectData;
    milestones: MilestoneData[];
    members: MemberData[];
    documents: DocumentData[];
    finance: FinanceData;
    tasks: TaskData[]; // ✅ Tasks là một mảng TaskData
    taskFeed: React.ReactNode; // ✅ taskFeed đã được Server render
    membersCount: number;
    documentsCount: number;
}

// ✅ Danh sách tab
const tabs = ["Tổng quan", "Công việc & Mốc thời gian", "Nhân sự", "Tài liệu", "Tài chính"];

export default function ProjectTabs({
    project,
    milestones,
    members,
    documents,
    finance,
    tasks, // task thô
    taskFeed, // ✅ taskFeed đã được Server render
    membersCount,
    documentsCount,
}: ProjectTabsProps) {
    const [activeTab, setActiveTab] = useState("Tổng quan");

    return (
        <div className="w-full">
            {/* Navigations */}
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

            {/* Content */}
            {activeTab === "Tổng quan" && (
                <ProjectOverviewTab project={project} milestones={milestones} />
            )}
            {/* ⚠️ KHẮC PHỤC LỖI TS2322 (membersCount) */}
            {activeTab === "Nhân sự" && <ProjectMembersTab members={members} /* membersCount={membersCount} */ />}
            {/* ⚠️ KHẮC PHỤC LỖI TS2322 (documentsCount): Loại bỏ prop documentsCount */}
            {activeTab === "Tài liệu" && <ProjectDocumentsTab documents={documents} /* documentsCount={documentsCount} */ />}
            {activeTab === "Tài chính" && <ProjectFinanceTab finance={finance} />}
            {/* ✅ Truyền taskFeed xuống ProjectMilestoneTab */}
            {activeTab === "Công việc & Mốc thời gian" && (
                <ProjectMilestoneTab
                    projectId={project.id}
                    milestones={milestones}
                    tasks={tasks} // Truyền tasks thô (dành cho nút Tạo Task và đếm số lượng)
                    members={members}
                    taskFeed={taskFeed} // ✅ Truyền Task Feed đã được Server render
                />
            )}
        </div>
    );
}
