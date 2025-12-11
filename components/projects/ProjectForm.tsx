"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocateFixed, Loader2 } from "lucide-react";
// ✅ FIX: Import Server Actions
import { createProject, updateProject } from "@/lib/action/projectActions";

const PROJECT_TYPES = [
    { value: "building", label: "Công trình dân dụng" },
    { value: "industrial", label: "Công trình công nghiệp" },
    { value: "infrastructure", label: "Hạ tầng kỹ thuật" },
    { value: "transport", label: "Giao thông" },
    { value: "urban", label: "Đô thị" },
    { value: "agriculture", label: "Nông nghiệp/Nông thôn" },
    { value: "other", label: "Khác" },
];

const CONSTRUCTION_TYPES = [
    { value: "new", label: "Xây mới" },
    { value: "repair", label: "Sửa chữa" },
    { value: "renovation", label: "Cải tiến" },
    { value: "expansion", label: "Mở rộng" },
];

interface ProjectFormData {
    id?: string;
    name: string;
    code: string;
    customer_id: string;
    project_manager: string;
    address: string;
    geocode: string;
    start_date: string;
    end_date: string;
    budget: string;
    project_type: string;
    construction_type: string;
    description: string;
}

interface ProjectFormProps {
    initialData?: any;
    customers: { id: string; name: string }[];
    managers: { id: string; name: string }[];
    onSuccess?: () => void;
}

export default function ProjectForm({ initialData, customers, managers, onSuccess }: ProjectFormProps) {

    const router = useRouter();
    const [form, setForm] = useState<ProjectFormData>({
        name: "",
        code: "",
        customer_id: "",
        project_manager: "",
        address: "",
        geocode: "",
        start_date: "",
        end_date: "",
        budget: "",
        project_type: "",
        construction_type: "",
        description: "",
        ...initialData,
    });

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const initialDataRef = useRef<Partial<ProjectFormData>>(initialData);

    useEffect(() => {
        if (JSON.stringify(initialData) !== JSON.stringify(initialDataRef.current)) {
            setForm(f => ({ ...f, ...initialData }));
            initialDataRef.current = initialData;
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const handleGeocode = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const lat = position.coords.latitude.toFixed(6);
                const lng = position.coords.longitude.toFixed(6);
                setForm(f => ({ ...f, geocode: `${lat},${lng}` }));
            });
        }
    };

    const parseNumber = (value: string) => value.replace(/,/g, "");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // ✅ FIX: Chuyển đổi sang FormData để tương thích với Server Action
            const formData = new FormData();

            // Append ID nếu đang ở chế độ Edit
            if (form.id) {
                formData.append("id", form.id);
            }

            // Append các trường dữ liệu
            formData.append("name", form.name);
            formData.append("code", form.code);
            formData.append("customer_id", form.customer_id || "");
            formData.append("project_manager", form.project_manager || "");
            formData.append("address", form.address || "");
            formData.append("geocode", form.geocode || "");
            formData.append("start_date", form.start_date || "");
            formData.append("end_date", form.end_date || "");
            // Xử lý budget: Xóa dấu phẩy trước khi gửi
            formData.append("budget", form.budget ? parseNumber(form.budget) : "0");
            formData.append("project_type", form.project_type);
            formData.append("construction_type", form.construction_type || "");
            formData.append("description", form.description || "");

            // ✅ FIX: Gọi Server Action thay vì fetch API
            let result;
            if (form.id) {
                result = await updateProject(formData);
            } else {
                result = await createProject(formData);
            }

            if (!result.success) {
                throw new Error(result.error || "Có lỗi xảy ra khi lưu dự án");
            }

            // Thành công
            if (onSuccess) {
                onSuccess();
            } else {
                // Redirect nếu không có callback onSuccess
                router.push(form.id ? `/projects/${form.id}` : "/projects");
                router.refresh(); // Refresh để cập nhật dữ liệu mới nhất
            }

        } catch (err: any) {
            console.error("Submit Error:", err);
            setError(err.message || "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-6 py-8 space-y-6 bg-white rounded-lg shadow-sm border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phần form bên trái */}
                <div className="flex flex-col gap-4">
                    <div>
                        <Label htmlFor="name">Tên dự án <span className="text-red-500">*</span></Label>
                        <Input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Nhập tên dự án" />
                    </div>
                    <div>
                        <Label htmlFor="address">Địa chỉ công trình</Label>
                        <Input id="address" name="address" value={form.address} onChange={handleChange} placeholder="Số nhà, đường, quận/huyện..." />
                    </div>
                    <div>
                        <Label htmlFor="project_manager">Quản lý dự án</Label>
                        <select
                            id="project_manager"
                            name="project_manager"
                            value={form.project_manager}
                            onChange={handleChange}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">-- Chọn quản lý --</option>
                            {managers.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="start_date">Ngày bắt đầu</Label>
                        <Input id="start_date" name="start_date" type="date" value={form.start_date?.slice(0, 10) || ""} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="budget">Ngân sách (VND)</Label>
                        <Input
                            id="budget"
                            name="budget"
                            type="text"
                            value={form.budget ? Number(parseNumber(form.budget)).toLocaleString("vi-VN") : ""}
                            onChange={e => {
                                const raw = e.target.value.replace(/\D/g, "");
                                setForm(f => ({ ...f, budget: raw }));
                            }}
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <Label htmlFor="construction_type">Loại hình xây dựng</Label>
                        <select
                            id="construction_type"
                            name="construction_type"
                            value={form.construction_type}
                            onChange={handleChange}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">-- Chọn loại hình --</option>
                            {CONSTRUCTION_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Phần form bên phải */}
                <div className="flex flex-col gap-4">
                    <div>
                        <Label htmlFor="code">Mã dự án <span className="text-red-500">*</span></Label>
                        <Input id="code" name="code" value={form.code} onChange={handleChange} required placeholder="VD: DA-2024-001" />
                    </div>
                    <div>
                        <Label htmlFor="geocode">Tọa độ (Geocode)</Label>
                        <div className="flex gap-2">
                            <Input id="geocode" name="geocode" value={form.geocode} onChange={handleChange} className="flex-1" placeholder="Lat, Long" />
                            <Button type="button" variant="outline" onClick={handleGeocode} title="Lấy vị trí hiện tại" className="px-3">
                                <LocateFixed className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="customer_id">Chủ đầu tư</Label>
                        <select
                            id="customer_id"
                            name="customer_id"
                            value={form.customer_id}
                            onChange={handleChange}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">-- Chọn chủ đầu tư --</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="end_date">Ngày kết thúc</Label>
                        <Input id="end_date" name="end_date" type="date" value={form.end_date?.slice(0, 10) || ""} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="project_type">Loại dự án</Label>
                        <select
                            id="project_type"
                            name="project_type"
                            value={form.project_type}
                            onChange={handleChange}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">-- Chọn loại dự án --</option>
                            {PROJECT_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div>
                <Label htmlFor="description">Mô tả chi tiết</Label>
                <Textarea id="description" name="description" value={form.description} onChange={handleChange} rows={4} placeholder="Thông tin chi tiết về dự án..." />
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm text-center">
                    {error}
                </div>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Hủy bỏ
                </Button>
                <Button type="submit" disabled={loading} className="min-w-[120px]">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {form.id ? "Lưu thay đổi" : "Tạo dự án"}
                </Button>
            </div>
        </form>
    );
}