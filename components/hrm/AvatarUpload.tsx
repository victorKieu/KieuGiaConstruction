"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { Camera, Loader2, X } from "lucide-react";

interface Props {
    defaultValue?: string | null;
    onUploadSuccess: (url: string) => void;
}

export default function AvatarUpload({ defaultValue, onUploadSuccess }: Props) {
    const [preview, setPreview] = useState<string>(defaultValue || "");
    const [uploading, setUploading] = useState(false);
    const supabase = createClient();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!e.target.files || e.target.files.length === 0) return;
            setUploading(true);

            const file = e.target.files[0];
            const fileExt = file.name.split(".").pop();
            const fileName = `${uuidv4()}.${fileExt}`; // Tên file ngẫu nhiên tránh trùng

            // 1. Upload lên Bucket 'avatars'
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Lấy Public URL
            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(fileName);

            // 3. Cập nhật state và báo cho Form cha
            setPreview(publicUrl);
            onUploadSuccess(publicUrl);

        } catch (error: any) {
            alert("Lỗi tải ảnh: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setPreview("");
        onUploadSuccess(""); // Gửi chuỗi rỗng để server biết là xóa ảnh
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                    {preview ? (
                        <img
                            src={preview}
                            alt="Avatar Preview"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Camera size={48} strokeWidth={1.5} />
                        </div>
                    )}
                </div>

                {/* Loading Layer */}
                {uploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <Loader2 className="animate-spin text-white" size={24} />
                    </div>
                )}

                {/* Nút Upload */}
                <label className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer shadow-md transition-transform active:scale-95">
                    <Camera size={16} />
                    <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                </label>

                {/* Nút Xóa ảnh (chỉ hiện khi có ảnh) */}
                {preview && !uploading && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-0 right-0 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 shadow-sm transition-colors"
                        title="Xóa ảnh"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
            <p className="text-xs text-gray-500 font-medium">
                {uploading ? "Đang tải lên..." : "JPG, PNG tối đa 5MB"}
            </p>
        </div>
    );
}