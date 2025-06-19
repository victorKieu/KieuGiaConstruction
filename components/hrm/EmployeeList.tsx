import React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomerList } from "@/lib/actions";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Pagination } from "@/components/ui/pagination";

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
  <div className="bg-white rounded-lg shadow p-4">
    <h2 className="text-xl font-bold mb-4">Danh sách nhân viên</h2>
    <table className="w-full table-auto">
      <thead>
        <tr>
          <th>Mã NV</th>
          <th>Họ tên</th>
          <th>Phòng ban</th>
          <th>Chức vụ</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {employees.map(emp => (
          <tr key={emp.id} onClick={() => onSelect(emp)} className="hover:bg-gray-100 cursor-pointer">
            <td>{emp.code}</td>
            <td>{emp.name}</td>
            <td>{emp.department}</td>
            <td>{emp.position}</td>
            <td>
              {emp.status === "active" ? (
                <span className="text-green-600">Đang làm</span>
              ) : (
                <span className="text-gray-500">Nghỉ việc</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>

);

export default EmployeeList;