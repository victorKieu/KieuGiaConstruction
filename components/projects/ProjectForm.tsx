"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocateFixed, Loader2 } from "lucide-react";
import { createProject, updateProject } from "@/lib/action/projectActions";

interface ProjectFormProps {
    initialData?: any;
    customers: { id: string; name: string }[];
    managers: { id: string; name: string }[];
    projectTypes: { id: string; name: string }[];
    constructionTypes: { id: string; name: string }[];
    onSuccess?: () => void;
}

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
    type_id: string;
    construction_type_id: string;
    description: string;
}

export default function ProjectForm({
    initialData,
    customers = [],
    managers = [],
    projectTypes = [],
    constructionTypes = [],
    onSuccess
}: ProjectFormProps) {

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
        type_id: initialData?.type_id || initialData?.project_type || "",
        construction_type_id: initialData?.construction_type_id || initialData?.construction_type || "",
        description: "",
        ...initialData,
    });

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const initialDataRef = useRef<any>(initialData);

    useEffect(() => {
        if (initialData && JSON.stringify(initialData) !== JSON.stringify(initialDataRef.current)) {
            setForm(f => ({
                ...f,
                ...initialData,
                type_id: initialData.type_id || initialData.project_type || "",
                construction_type_id: initialData.construction_type_id || initialData.construction_type || ""
            }));
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

    const parseNumber = (value: string) => value.toString().replace(/,/g, "");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const formData = new FormData();
            if (form.id) formData.append("id", form.id);

            formData.append("name", form.name);
            formData.append("code", form.code);
            formData.append("customer_id", form.customer_id || "");
            formData.append("project_manager", form.project_manager || "");
            formData.append("address", form.address || "");
            formData.append("geocode", form.geocode || "");
            formData.append("start_date", form.start_date || "");
            formData.append("end_date", form.end_date || "");
            formData.append("budget", form.budget ? parseNumber(form.budget) : "0");
            formData.append("type_id", form.type_id);
            formData.append("construction_type_id", form.construction_type_id);
            formData.append("description", form.description || "");

            let result;
            if (form.id) {
                result = await updateProject(formData);
            } else {
                result = await createProject(formData);
            }

            if (!result.success) {
                throw new Error(result.error || "Có lỗi xảy ra");
            }

            if (onSuccess) onSuccess();
            else {
                router.push(form.id ? `/projects/${form.id}` : "/projects");
                router.refresh();
            }

        } catch (err: any) {
            console.error("Submit Error:", err);
            setError(err.message || "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    }

    return (
        // ✅ FIX: bg-white -> bg-card, border -> border-border
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-6 py-8 space-y-6 bg-card text-card-foreground rounded-lg shadow-sm border border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CỘT TRÁI */}
                <div className="flex flex-col gap-4">
                    <div>
                        <Label htmlFor="name">Tên dự án <span className="text-red-500">*</span></Label>
                        <Input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Nhập tên dự án" className="bg-background" />
                    </div>
                    <div>
                        <Label htmlFor="address">Địa chỉ công trình</Label>
                        <Input id="address" name="address" value={form.address} onChange={handleChange} placeholder="Số nhà, đường, quận/huyện..." className="bg-background" />
                    </div>
                    <div>
                        <Label htmlFor="project_manager">Quản lý dự án</Label>
                        <select
                            id="project_manager"
                            name="project_manager"
                            value={form.project_manager}
                            onChange={handleChange}
                            // ✅ FIX: bg-background, text-foreground, border-input
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">-- Chọn quản lý --</option>
                            {managers.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="start_date">Ngày bắt đầu</Label>
                        <Input id="start_date" name="start_date" type="date" value={form.start_date?.slice(0, 10) || ""} onChange={handleChange} className="bg-background" />
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
                            className="bg-background"
                        />
                    </div>

                    {/* DROPDOWN LOẠI HÌNH XÂY DỰNG */}
                    <div>
                        <Label htmlFor="construction_type_id">Loại hình xây dựng</Label>
                        <select
                            id="construction_type_id"
                            name="construction_type_id"
                            value={form.construction_type_id}
                            onChange={handleChange}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">-- Chọn loại hình --</option>
                            {constructionTypes.length > 0 ? (
                                constructionTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))
                            ) : (
                                <option disabled>Không có dữ liệu</option>
                            )}
                        </select>
                    </div>
                </div>

                {/* CỘT PHẢI */}
                <div className="flex flex-col gap-4">
                    <div>
                        <Label htmlFor="code">Mã dự án <span className="text-red-500">*</span></Label>
                        <Input id="code" name="code" value={form.code} onChange={handleChange} required placeholder="VD: DA-2024-001" className="bg-background" />
                    </div>
                    <div>
                        <Label htmlFor="geocode">Tọa độ (Geocode)</Label>
                        <div className="flex gap-2">
                            <Input id="geocode" name="geocode" value={form.geocode} onChange={handleChange} className="flex-1 bg-background" placeholder="Lat, Long" />
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
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">-- Chọn chủ đầu tư --</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="end_date">Ngày kết thúc</Label>
                        <Input id="end_date" name="end_date" type="date" value={form.end_date?.slice(0, 10) || ""} onChange={handleChange} className="bg-background" />
                    </div>

                    {/* DROPDOWN LOẠI DỰ ÁN */}
                    <div>
                        <Label htmlFor="type_id">Loại dự án</Label>
                        <select
                            id="type_id"
                            name="type_id"
                            value={form.type_id}
                            onChange={handleChange}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">-- Chọn loại dự án --</option>
                            {projectTypes.length > 0 ? (
                                projectTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))
                            ) : (
                                <option disabled>Không có dữ liệu</option>
                            )}
                        </select>
                    </div>
                </div>
            </div>
            <div>
                <Label htmlFor="description">Mô tả chi tiết</Label>
                <Textarea id="description" name="description" value={form.description} onChange={handleChange} rows={4} placeholder="Thông tin chi tiết về dự án..." className="bg-background" />
            </div>

            {/* ✅ FIX: Giao diện lỗi hỗ trợ Dark Mode */}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-md text-sm text-center">
                    {error}
                </div>
            )}

            {/* ✅ FIX: Border footer */}
            <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => router.back()}>Hủy bỏ</Button>
                <Button type="submit" disabled={loading} className="min-w-[120px]">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {form.id ? "Lưu thay đổi" : "Tạo dự án"}
                </Button>
            </div>
        </form>
    );
}