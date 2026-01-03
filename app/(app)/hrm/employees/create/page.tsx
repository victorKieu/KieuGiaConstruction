import EmployeeForm from "@/components/hrm/EmployeeForm"; // Import form tái sử dụng mới
import { getDictionaryOptions } from "@/lib/action/dictionaryActions";

export default async function CreateEmployeePage() {
    // Lấy dữ liệu từ điển
    const [departments, positions, genders, statuses, contractTypes, maritalStatuses] = await Promise.all([
        getDictionaryOptions('DEPARTMENT'),
        getDictionaryOptions('POSITION'),
        getDictionaryOptions('GENDER'),
        getDictionaryOptions('JOB_STATUS'),
        getDictionaryOptions('CONTRACT_TYPE'),
        getDictionaryOptions('MARITAL_STATUS')
    ]);

    return (
        <div className="p-6 max-w-[1200px] mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Thêm nhân viên mới</h1>
            {/* Gọi Form mà KHÔNG truyền initialData -> Chế độ Create */}
            <EmployeeForm
                options={{
                    departments, positions, genders, statuses, contractTypes, maritalStatuses
                }}
            />
        </div>
    );
}