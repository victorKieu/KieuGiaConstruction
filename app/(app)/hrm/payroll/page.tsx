'use client'
import React from "react";
import { PayrollTable, PayrollRecord } from "@/components/hrm/PayrollTable";

const payroll: PayrollRecord[] = [
  { id: "1", employeeCode: "NV001", name: "Nguyễn Văn A", department: "Kế toán", month: "05/2025", salary: 10000000, bonus: 500000, deduction: 200000, netSalary: 10300000 },
];

export default function PayrollPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Bảng lương</h1>
      <PayrollTable records={payroll} />
    </div>
  );
}