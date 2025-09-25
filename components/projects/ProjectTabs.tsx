"use client";

import { useState } from "react";
import ProjectOverviewTab from "./tab/ProjectOverviewTab";
import ProjectMembersTab from "./tab/ProjectMembersTab";
import ProjectDocumentsTab from "./tab/ProjectDocumentsTab";
import ProjectFinanceTab from "./tab/ProjectFinanceTab";
import ProjectMilestoneTab from "./tab/ProjectMilestoneTab";
import {ProjectData,MilestoneData,MemberData,DocumentData,FinanceData } from "@/types/project";

interface ProjectTabsProps {
    project: ProjectData;
    milestones: MilestoneData[];
    members: MemberData[];
    documents: DocumentData[];
    finance: FinanceData;
}

// ✅ Danh sách tab
const tabs = ["Tổng quan", "Nhân sự", "Tài liệu", "Tài chính"];

export default function ProjectTabs({
    project,
    milestones,
    members,
    documents,
    finance,
}: ProjectTabsProps) {
    const [activeTab, setActiveTab] = useState("Tổng quan");

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-4 border-b mb-4">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2 border-b-2 ${activeTab === tab
                                ? "border-blue-600 font-semibold"
                                : "border-transparent text-gray-500"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === "Tổng quan" && (
                <ProjectOverviewTab project={project} milestones={milestones} />
            )}
            {activeTab === "Nhân sự" && <ProjectMembersTab members={members} />}
            {activeTab === "Tài liệu" && <ProjectDocumentsTab documents={documents} />}
            {activeTab === "Tài chính" && <ProjectFinanceTab finance={finance} />}
            {activeTab === "Phân công công việc" && <ProjectMilestoneTab fmilestones={milestones} />}
        </div>
    );
}