// app/projects/new/page.tsx
import { getProjectManagers } from "@/lib/action/employeeActions";
import { getCustomerList } from "@/lib/action/crmActions"; //
import CreateProjectForm from "@/components/projects/ProjectForm";

export default async function NewProjectPage() {
    // Gọi song song (Promise.all) để tăng tốc độ tải trang
    const [customers, managers] = await Promise.all([
        getCustomerList(),
        getProjectManagers()
    ]);

    return (
        <div className="container mx-auto p-4 max-w-3xl"> {/* Thêm max-w để form không quá rộng */}
            <h1 className="text-2xl font-bold mb-6">Tạo dự án mới</h1>
            <CreateProjectForm
                customers={customers || []}
                managers={managers || []}
            // Truyền thêm hàm onSuccess nếu cần điều hướng sau khi tạo
            />
        </div>
    );
}