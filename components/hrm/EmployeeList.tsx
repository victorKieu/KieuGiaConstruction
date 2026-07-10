import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export interface Employee {
    id: string;
    name: string;
    code: string;
    department: string;
    position: string;
    status: "active" | "inactive";
}

interface EmployeeListProps {
    employees: Employee[];
    onSelect: (employee: Employee) => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ employees, onSelect }) => (
    <Card className="p-4 border-none shadow-sm bg-card text-card-foreground">
        <h2 className="text-xl font-bold mb-4 text-foreground">Danh sách nhân viên</h2>
        <div className="rounded-md border border-border">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                        <TableHead className="font-bold text-foreground">Mã NV</TableHead>
                        <TableHead className="font-bold text-foreground">Họ tên</TableHead>
                        <TableHead className="font-bold text-foreground">Phòng ban</TableHead>
                        <TableHead className="font-bold text-foreground">Chức vụ</TableHead>
                        <TableHead className="font-bold text-foreground text-center">Trạng thái</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {employees.map(emp => (
                        <TableRow
                            key={emp.id}
                            onClick={() => onSelect(emp)}
                            className="cursor-pointer hover:bg-muted/80 border-border transition-colors"
                        >
                            <TableCell className="font-mono text-xs font-medium text-muted-foreground">{emp.code}</TableCell>
                            <TableCell className="font-bold text-foreground">{emp.name}</TableCell>
                            <TableCell className="text-foreground">{emp.department}</TableCell>
                            <TableCell className="text-foreground">{emp.position}</TableCell>
                            <TableCell className="text-center">
                                {emp.status === "active" ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 border-none">Đang làm</Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-muted-foreground">Nghỉ việc</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </Card>
);

export default EmployeeList;