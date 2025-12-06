"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocateFixed, Loader2 } from "lucide-react";

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
//interface Customer { id: string; name: string; }
//interface Manager { id: string; name: string; }

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

    // Chỉ cập nhật lại form nếu initialData thay đổi và khác với initialDataRef
    useEffect(() => {
        if (JSON.stringify(initialData) !== JSON.stringify(initialDataRef.current)) {
            setForm(f => ({ ...f, ...initialData }));
            initialDataRef.current = initialData; // Cập nhật ref với initialData mới
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
            const isEdit = !!form.id;
            const url = isEdit ? "/api/projects/admin-update" : "/api/projects/create";

            // --- PHẦN FIX ---
            // 1. Tạo đối tượng projectData SẠCH.
            // Chúng ta chỉ gửi các trường mà form này quản lý.
            // Chúng ta cũng chuyển đổi các trường rỗng ("") sang NULL
            // (vì CSDL chấp nhận NULL, nhưng không chấp nhận "" cho kiểu số/ngày).
            const cleanProjectData = {
                name: form.name,
                code: form.code,
                customer_id: form.customer_id || null, // Gửi null nếu rỗng
                project_manager: form.project_manager || null, // Gửi null nếu rỗng
                address: form.address || null,
                geocode: form.geocode || null,
                start_date: form.start_date || null,
                end_date: form.end_date || null,
                budget: form.budget === "" ? 0 : Number(parseNumber(form.budget)), // Xử lý budget (bắt buộc là số)
                project_type: form.project_type, // Giả định trường này là bắt buộc (required)
                construction_type: form.construction_type || null,
                description: form.description || null,
            };

            // 2. Tạo body (Đã fix ở bước trước, giờ dùng cleanProjectData)
            const body = isEdit
                ? {
                    projectId: form.id,
                    updateData: {
                        projectData: cleanProjectData // Chỉ gửi dữ liệu sạch
                    }
                }
                : {
                    ...cleanProjectData // Logic create cũng nên dùng dữ liệu sạch
                };
            // --- KẾT THÚC FIX ---

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                let errorMsg = "Lỗi khi lưu dự án";
                try {
                    const data = await response.json();
                    errorMsg = data?.error || errorMsg;
                } catch { }
                throw new Error(errorMsg);
            }

            if (onSuccess) onSuccess();
            else router.push(isEdit ? `/projects/${form.id}` : "/projects");
        } catch (err: any) {
            setError(err.message || "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-6 py-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phần form bên trái */}
                <div className="flex flex-col gap-4">
                    <div>
                        <Label htmlFor="name">Tên dự án</Label>
                        <Input id="name" name="name" value={form.name} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label htmlFor="address">Địa chỉ công trình</Label>
                        <Input id="address" name="address" value={form.address} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="project_manager">Quản lý dự án</Label>
                        <select
                            id="project_manager"
                            name="project_manager"
                            value={form.project_manager}
                            onChange={handleChange}
                            className="border rounded w-full p-2"
                        >
                            <option value="">Chọn quản lý dự án</option>
                            {managers.map(m => (
                                // Đã sửa key từ m.user_id sang m.id
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
                            value={Number(form.budget).toLocaleString("vi-VN")}
                            onChange={e => {
                                const raw = e.target.value.replace(/\D/g, "");
                                setForm(f => ({ ...f, budget: raw }));
                            }}
                        />
                    </div>
                    <div>
                        <Label htmlFor="construction_type">Loại hình xây dựng</Label>
                        <select
                            id="construction_type"
                            name="construction_type"
                            value={form.construction_type}
                            onChange={handleChange}
                            className="border rounded w-full p-2"
                        >
                            <option value="">Chọn loại hình xây dựng</option>
                            {CONSTRUCTION_TYPES.map(type => (
                                // Đã thêm key prop ở đây!
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
                        <Label htmlFor="code">Mã dự án</Label>
                        <Input id="code" name="code" value={form.code} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label htmlFor="geocode">Geocode</Label>
                        <div className="flex gap-2">
                            <Input id="geocode" name="geocode" value={form.geocode} onChange={handleChange} className="flex-1" />
                            <Button type="button" variant="outline" onClick={handleGeocode} title="Lấy vị trí hiện tại" className="p-2">
                                <LocateFixed className="w-5 h-5" />
                            </Button>
                        </div>
                        <small className="text-xs text-muted-foreground">latitude,longitude</small>
                    </div>
                    <div>
                        <Label htmlFor="customer_id">Chủ đầu tư</Label>
                        <select
                            id="customer_id"
                            name="customer_id"
                            value={form.customer_id}
                            onChange={handleChange}
                            className="border rounded w-full p-2"
                        >
                            <option value="">Chọn chủ đầu tư</option>
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
                            className="border rounded w-full p-2"
                        >
                            <option value="">Chọn loại dự án</option>
                            {PROJECT_TYPES.map(type => (
                                // Đã thêm key prop ở đây!
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div>
                <Label htmlFor="description">Mô tả</Label>
                <Textarea id="description" name="description" value={form.description} onChange={handleChange} rows={4} />
            </div>
            {error && <div className="text-red-500 text-center">{error}</div>}
            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Hủy
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {form.id ? "Lưu thay đổi" : "Tạo dự án"}
                </Button>
            </div>
        </form>
    );
}