import { getCustomers, getProjectManagers } from "@/lib/actions";
import CreateProjectForm from "@/components/projects/ProjectForm";

export default async function NewProjectPage() {
    const customers = await getCustomers();
    const managers = await getProjectManagers();

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Tạo dự án mới</h1>
            <CreateProjectForm customers={customers || []} managers={managers || []} />
        </div>
    );
}