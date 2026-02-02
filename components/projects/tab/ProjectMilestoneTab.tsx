"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { MilestoneData, TaskData, MemberData } from "@/types/project";
import TaskCreateModal from "@/components/tasks/TaskCreateModal";
import WBSTaskTable from "@/components/tasks/WBSTaskTable";
import { ProjectTaskList } from "@/components/tasks/project-task-list";
import { LayoutList, ListTree } from "lucide-react";

interface DictionaryItem { id: string; name: string; code: string; color?: string; }

interface ProjectMilestoneTabProps {
    projectId: string;
    milestones: MilestoneData[];
    tasks: TaskData[];
    members: MemberData[];
    taskFeed?: React.ReactNode;
    dictionaries: { statuses: DictionaryItem[]; priorities: DictionaryItem[]; };
    currentUserId: string; // ✅ Thêm prop này
}

export default function ProjectMilestoneTab({
    projectId,
    tasks,
    members,
    taskFeed,
    dictionaries,
    currentUserId // ✅ Nhận prop
}: ProjectMilestoneTabProps) {

    const [viewMode, setViewMode] = useState<"tree" | "list">("tree");

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-none bg-transparent">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Tiến độ & Công việc</h3>
                        <p className="text-sm text-slate-500">Quản lý vòng đời dự án theo mô hình WBS</p>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                        <button onClick={() => setViewMode("tree")} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${viewMode === "tree" ? "bg-blue-50 text-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
                            <ListTree className="w-4 h-4" /> Cây WBS
                        </button>
                        <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${viewMode === "list" ? "bg-blue-50 text-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
                            <LayoutList className="w-4 h-4" /> Danh sách
                        </button>
                    </div>

                    <TaskCreateModal projectId={projectId} members={members} tasks={tasks} dictionaries={dictionaries} />
                </div>

                {viewMode === "tree" ? (
                    <WBSTaskTable projectId={projectId} initialTasks={tasks} members={members} dictionaries={dictionaries} />
                ) : (
                    <div className="space-y-4">
                        {/* ✅ Truyền đủ props để hiển thị comment */}
                        <ProjectTaskList
                            projectId={projectId}
                            tasks={tasks}
                            members={members}
                            currentUserId={currentUserId}
                        />
                        {tasks.length === 0 && <p className="text-center py-10 text-slate-500">Chưa có công việc nào.</p>}
                    </div>
                )}
            </Card>
        </div>
    );
}