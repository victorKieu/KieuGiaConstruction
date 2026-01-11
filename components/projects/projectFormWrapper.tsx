"use client";

import React from "react";
import ProjectForm from "./ProjectForm"; // Giả sử ProjectForm nằm cùng thư mục
// Import interface nếu cần thiết (hoặc dùng any cho nhanh nếu đang dev)

interface WrapperProps {
    initialData?: any;
    customers: any[];
    managers: any[];
    // ✅ THÊM 2 PROPS MỚI
    projectTypes: any[];
    constructionTypes: any[];
    onSuccess: () => void;
}

export default function ProjectFormWrapper({
    initialData,
    customers,
    managers,
    projectTypes,
    constructionTypes,
    onSuccess
}: WrapperProps) {
    return (
        <ProjectForm
            initialData={initialData}
            customers={customers}
            managers={managers}
            // ✅ TRUYỀN XUỐNG CHO FORM
            projectTypes={projectTypes}
            constructionTypes={constructionTypes}
            onSuccess={onSuccess}
        />
    );
}