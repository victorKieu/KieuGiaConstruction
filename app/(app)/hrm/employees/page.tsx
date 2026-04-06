import React, { Suspense } from "react";
import { Metadata } from "next";
import { getEmployees } from "@/lib/action/employeeActions";
import { getDictionaryOptions } from "@/lib/action/dictionaryActions";
import EmployeesClientPage from "@/components/hrm/EmployeesClientPage";

export const metadata: Metadata = {
    title: "Quản lý Nhân sự | Kieu Gia Construction",
    description: "Danh sách và quản lý hồ sơ nhân viên",
};

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EmployeesPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const queryStr = typeof searchParams.q === "string" ? searchParams.q : "";

    const [employeesData, departmentOptions, statusOptions] = await Promise.all([
        getEmployees({ search: queryStr, page: 1, limit: 10 }),
        getDictionaryOptions("DEPARTMENT"),
        getDictionaryOptions("JOB_STATUS"),
    ]);

    const departments = departmentOptions?.map((d: any) => d.name) || [];
    const statuses = statusOptions?.map((s: any) => s.name) || [];

    return (
        // ✅ Thêm dark:bg-slate-900/50
        <div className="h-full bg-slate-50/50 dark:bg-slate-900/50 p-6 transition-colors">
            <Suspense fallback={<div className="text-center p-10 dark:text-slate-400">Đang tải danh sách...</div>}>
                <EmployeesClientPage
                    initialEmployees={employeesData.employees}
                    initialTotalCount={employeesData.totalCount}
                    departments={departments}
                    statusOptions={statuses}
                />
            </Suspense>
        </div>
    );
}