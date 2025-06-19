'use client'
import React from "react";
import { AttendanceTable, AttendanceRecord } from "@/components/hrm/AttendanceTable";

const attendance: AttendanceRecord[] = [
  { id: "1", date: "2025-05-20", employeeCode: "NV001", name: "Nguyễn Văn A", checkIn: "08:05", checkOut: "17:00", status: "Đủ công" },
];

export default function AttendancePage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Bảng chấm công</h1>
      <AttendanceTable records={attendance} />
    </div>
  );
}