"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { addProjectMember } from "@/lib/action/projectActions";
import { toast } from "sonner";
import { Loader2, Plus, UserPlus } from "lucide-react";

interface AddMemberDialogProps {
    projectId: string;
    employees: any[];       // Danh sách toàn bộ nhân viên công ty
    roles: any[];           // Danh sách vai trò từ sys_dictionaries (PROJECT_ROLE)
    existingMemberIds: string[]; // ID những người đã ở trong dự án để disable
}

export default function AddMemberDialog({
    projectId,
    employees,
    roles,
    existingMemberIds
}: AddMemberDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // State lưu giá trị chọn
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");

    const handleAddMember = () => {
        if (!selectedEmployeeId || !selectedRoleId) {
            toast.error("Vui lòng chọn đầy đủ nhân viên và vai trò");
            return;
        }

        startTransition(async () => {
            // Gọi Server Action để chèn vào bảng project_members
            const res = await addProjectMember(projectId, selectedEmployeeId, selectedRoleId);

            if (res.success) {
                toast.success("Đã thêm thành viên vào dự án");
                setOpen(false); // Đóng modal
                setSelectedEmployeeId(""); // Reset form
                setSelectedRoleId("");
            } else {
                toast.error(res.error || "Có lỗi xảy ra khi thêm thành viên");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm">
                    <Plus size={16} />
                    <span>Thêm nhân sự</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-indigo-600" />
                        Thêm nhân sự dự án
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* Phần chọn Nhân viên */}
                    <div className="space-y-2">
                        <Label htmlFor="employee" className="text-sm font-semibold">
                            Nhân viên <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={selectedEmployeeId}
                            onValueChange={setSelectedEmployeeId}
                        >
                            <SelectTrigger id="employee" className="w-full">
                                <SelectValue placeholder="Tìm chọn nhân viên..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[250px]">
                                {employees.length === 0 && (
                                    <div className="p-2 text-center text-xs text-gray-400">Không có dữ liệu nhân viên</div>
                                )}
                                {employees.map((emp) => {
                                    const isAlreadyInProject = existingMemberIds.includes(emp.id);
                                    return (
                                        <SelectItem
                                            key={emp.id}
                                            value={emp.id}
                                            disabled={isAlreadyInProject}
                                        >
                                            <div className="flex flex-col">
                                                <span>{emp.name}</span>
                                                <span className="text-[10px] text-gray-400">
                                                    {isAlreadyInProject ? "Đã tham gia dự án" : (emp.email || "Chưa có email")}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Phần chọn Vai trò (Role) */}
                    <div className="space-y-2">
                        <Label htmlFor="role" className="text-sm font-semibold">
                            Vai trò trong dự án <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={selectedRoleId}
                            onValueChange={setSelectedRoleId}
                        >
                            <SelectTrigger id="role" className="w-full">
                                <SelectValue placeholder="Chọn vai trò (Manager, Supervisor...)" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                        {role.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] text-gray-400 italic">
                            * Vai trò này quyết định quyền thao tác của nhân sự trong dự án.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        disabled={isPending}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleAddMember}
                        className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px]"
                        disabled={isPending}
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            "Xác nhận thêm"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}