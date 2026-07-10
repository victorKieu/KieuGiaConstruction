// app/projects/new/page.tsx
import { getProjectManagers } from "@/lib/action/employeeActions";
import { getCustomerList } from "@/lib/action/crmActions";
// ✅ 1. Bổ sung import 2 hàm lấy dictionary
import { getProjectTypes, getConstructionTypes } from "@/lib/action/projectActions";
import CreateProjectForm from "@/components/projects/ProjectForm";

export default async function NewProjectPage() {
    // ✅ 2. Gọi song song cả 4 API để lấy đầy đủ dữ liệu
    const [customers, managers, projectTypes, constructionTypes] = await Promise.all([
        getCustomerList(),
        getProjectManagers(),
        getProjectTypes(),      // Lấy danh sách Loại dự án
        getConstructionTypes()  // Lấy danh sách Loại hình xây dựng
    ]);

    return (
        // ✅ FIX UI: Bỏ max-w-3xl để form bung rộng đẹp mắt theo thiết kế 2 cột (max-w-6xl) của Component
        <div className="container mx-auto p-4 md:p-8">
            {/* Thêm text-foreground để hỗ trợ Dark Mode */}
            <h1 className="text-2xl font-bold mb-6 text-foreground">Tạo dự án mới</h1>

            <CreateProjectForm
                customers={customers || []}
                managers={managers || []}
                // ✅ 3. Truyền dữ liệu vào form
                projectTypes={projectTypes || []}
                constructionTypes={constructionTypes || []}
            />
        </div>
    );
}