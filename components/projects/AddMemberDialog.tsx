import React, { useState } from "react";
import { Button } from "@/components/ui/button";

// Định nghĩa kiểu cho User
interface User {
    id: string;
    name: string;
    email: string;
}

// Định nghĩa kiểu cho props của component
interface AddMemberDialogProps {
    users?: User[];
    onAdd: (userId: string, role: string) => void;
    onClose: () => void;
}

export default function AddMemberDialog({ users = [], onAdd, onClose }: AddMemberDialogProps) {
    const [selectedUser, setSelectedUser] = useState("");
    const [role, setRole] = useState("member");

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-20 z-50">
            <div className="bg-white rounded shadow-lg p-6 min-w-[320px]">
                <h3 className="text-lg font-bold mb-4">Thêm thành viên</h3>
                <div className="mb-3">
                    <label>Chọn người dùng:</label>
                    <select
                        className="w-full border rounded mt-1 p-2"
                        value={selectedUser}
                        onChange={e => setSelectedUser(e.target.value)}
                    >
                        <option value="">-- Chọn --</option>
                        {users.map(u => (
                            <option value={u.id} key={u.id}>{u.name} ({u.email})</option>
                        ))}
                    </select>
                </div>
                <div className="mb-3">
                    <label>Vai trò:</label>
                    <select
                        className="w-full border rounded mt-1 p-2"
                        value={role}
                        onChange={e => setRole(e.target.value)}
                    >
                        <option value="member">Thành viên</option>
                        <option value="manager">Quản lý</option>
                    </select>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Huỷ</Button>
                    <Button
                        onClick={() => selectedUser && onAdd(selectedUser, role)}
                        disabled={!selectedUser}
                    >
                        Thêm
                    </Button>
                </div>
            </div>
        </div>
    );
}