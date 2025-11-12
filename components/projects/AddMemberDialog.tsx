// components/projects/AddMemberDialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import type 'Employee' từ file types của bạn.
// (Dựa trên File 271, bạn có thể đang dùng '@/types/hrm')
import type { Employee } from "@/types/hrm"; // <-- Đảm bảo đường dẫn này đúng

interface AddMemberDialogProps {
    members: Employee[]; // Danh sách nhân viên CHƯA có trong dự án
    onAdd: (employeeId: string, role: string) => void;
    onClose: () => void;
}

export default function AddMemberDialog({ members, onAdd, onClose }: AddMemberDialogProps) {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
    // (Dựa trên File 271, vai trò trong project_members là 'string' ('member', 'manager'))
    const [selectedRole, setSelectedRole] = useState<string>("member");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        setError(null);
        if (!selectedEmployeeId) {
            setError("Vui lòng chọn một nhân viên.");
            return;
        }
        // Gọi hàm handleAdd (từ ProjectMembersClient) với ID và Vai trò
        onAdd(selectedEmployeeId, selectedRole);
    };

    return (
        // 'open={true}' vì nó được render có điều kiện bởi `showAdd`
        <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Thêm Thành viên Mới</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-1">
                        <Label htmlFor="employee-select">Chọn Nhân viên</Label>
                        <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId}>
                            <SelectTrigger id="employee-select">
                                <SelectValue placeholder="Chọn nhân viên để thêm..." />
                            </SelectTrigger>
                            <SelectContent>
                                {members.length === 0 && (
                                    <SelectItem value="none" disabled>Đã thêm tất cả nhân viên</SelectItem>
                                )}
                                {members.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                        {emp.name} ({emp.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="role-select">Chọn Vai trò (Trong Dự án)</Label>
                        <Select onValueChange={setSelectedRole} defaultValue="member">
                            <SelectTrigger id="role-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="member">Thành viên (Member)</SelectItem>
                                <SelectItem value="manager">Quản lý (Manager)</SelectItem>
                                <SelectItem value="supervisor">Giám sát (Supervisor)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {error && (
                        <p className="text-red-500 text-sm">{error}</p>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
                    <Button type="button" onClick={handleSubmit}>Thêm vào Dự án</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}