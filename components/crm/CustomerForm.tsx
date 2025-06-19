"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Định nghĩa kiểu dữ liệu cho form một cách tường minh hơn
interface CustomerFormData {
    name: string;
    type: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    taxCode: string;
    birthday: string; // Giữ kiểu string để tương thích với input type="date"
    gender: string;
    status: string;
    tagId: string;
    ownerId: string;
}

// Kiểu dữ liệu cho props của component
interface CustomerFormProps {
    initialData?: Partial<CustomerFormData & { id: string }>; // Dữ liệu ban đầu có thể là một phần và có id
    tags: { id: string; name: string }[];
    users: { id: string; name: string }[];
}

const CustomerForm: React.FC<CustomerFormProps> = ({ initialData, tags, users }) => {
    const router = useRouter();
    const [formData, setFormData] = useState<CustomerFormData>({
        name: "",
        type: "individual",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        taxCode: "",
        birthday: "",
        gender: "male",
        status: "active",
        tagId: "",
        ownerId: "",
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sử dụng useEffect để điền dữ liệu vào form khi initialData thay đổi (cho trường hợp chỉnh sửa)
    useEffect(() => {
        if (initialData) {
            // Chuyển đổi birthday về định dạng YYYY-MM-DD cho input type="date"
            const formattedData = {
                ...initialData,
                birthday: initialData.birthday ? new Date(initialData.birthday).toISOString().split('T')[0] : "",
            };
            setFormData(prev => ({ ...prev, ...formattedData }));
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (id: keyof CustomerFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const method = initialData?.id ? "PUT" : "POST";
            const url = initialData?.id ? `/api/customers/create${initialData.id}` : "/api/customers/create";

            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
            }

            // Sau khi thành công, chuyển hướng về trang danh sách khách hàng và làm mới dữ liệu
            router.push("/customers");
            router.refresh();
            // Bạn có thể thêm thông báo thành công ở đây (ví dụ: dùng react-toastify)

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tên khách hàng */}
                <div className="space-y-2">
                    <Label htmlFor="name">Tên khách hàng <span className="text-red-500">*</span></Label>
                    <Input id="name" value={formData.name} onChange={handleChange} required disabled={isLoading} />
                </div>

                {/* Loại khách hàng */}
                <div className="space-y-2">
                    <Label htmlFor="type">Loại khách hàng</Label>
                    <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)} disabled={isLoading}>
                        <SelectTrigger id="type">
                            <SelectValue placeholder="Chọn loại" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="individual">Cá nhân</SelectItem>
                            <SelectItem value="company">Doanh nghiệp</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={handleChange} disabled={isLoading} />
                </div>

                {/* Số điện thoại */}
                <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input id="phone" value={formData.phone} onChange={handleChange} disabled={isLoading} />
                </div>

                {/* Người liên hệ */}
                <div className="space-y-2">
                    <Label htmlFor="contactPerson">Người liên hệ</Label>
                    <Input id="contactPerson" value={formData.contactPerson} onChange={handleChange} disabled={isLoading} />
                </div>

                {/* Mã số thuế */}
                <div className="space-y-2">
                    <Label htmlFor="taxCode">Mã số thuế</Label>
                    <Input id="taxCode" value={formData.taxCode} onChange={handleChange} disabled={isLoading} />
                </div>

                {/* Ngày sinh */}
                <div className="space-y-2">
                    <Label htmlFor="birthday">Ngày sinh</Label>
                    <Input id="birthday" type="date" value={formData.birthday} onChange={handleChange} disabled={isLoading} />
                </div>

                {/* Giới tính */}
                <div className="space-y-2">
                    <Label htmlFor="gender">Giới tính</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)} disabled={isLoading}>
                        <SelectTrigger id="gender">
                            <SelectValue placeholder="Chọn giới tính" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Nam</SelectItem>
                            <SelectItem value="female">Nữ</SelectItem>
                            <SelectItem value="other">Khác</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Người phụ trách */}
                <div className="space-y-2">
                    <Label htmlFor="ownerId">Người phụ trách</Label>
                    <Select value={formData.ownerId} onValueChange={(value) => handleSelectChange("ownerId", value)} disabled={isLoading}>
                        <SelectTrigger id="ownerId">
                            <SelectValue placeholder="Chọn người phụ trách" />
                        </SelectTrigger>
                        <SelectContent>
                            {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Thẻ */}
                <div className="space-y-2">
                    <Label htmlFor="tagId">Gán thẻ</Label>
                    <Select value={formData.tagId} onValueChange={(value) => handleSelectChange("tagId", value)} disabled={isLoading}>
                        <SelectTrigger id="tagId">
                            <SelectValue placeholder="Chọn thẻ" />
                        </SelectTrigger>
                        <SelectContent>
                            {tags.map(tag => (
                                <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Địa chỉ */}
            <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Textarea id="address" value={formData.address} onChange={handleChange} disabled={isLoading} />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData?.id ? "Cập nhật" : "Tạo mới"}
                </Button>
            </div>
        </form>
    );
};

export default CustomerForm;