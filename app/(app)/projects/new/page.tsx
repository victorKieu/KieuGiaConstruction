import { getProjectManagers } from "@/lib/action/hrmActions";
import { getCustomerList } from "@/lib/action/crmActions";
import CreateProjectForm from "@/components/projects/ProjectForm";

export default async function NewProjectPage() {
    const customers = await getCustomerList();
    const managers = await getProjectManagers();

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Tạo dự án mới</h1>
            <CreateProjectForm customers={customers || []} managers={managers || []} />
        </div>
    );
}