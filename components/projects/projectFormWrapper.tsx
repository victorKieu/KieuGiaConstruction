"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProjectForm from "./ProjectForm";

interface ProjectFormWrapperProps {
    initialData?: any;
    customers: { id: string; name: string }[];
    managers: { id: string; name: string }[];
}

export default function ProjectFormWrapper({ initialData, customers, managers }: ProjectFormWrapperProps) {
    const router = useRouter();

    function handleSuccess() {
        toast.success("Dự án đã được lưu!");
        router.push("/projects");
    }

    return (
        <ProjectForm
            initialData={initialData}
            customers={customers || []}
            managers={managers || []}
            onSuccess={handleSuccess}
        />
    );
}