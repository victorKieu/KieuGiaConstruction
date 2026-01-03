"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { Camera, Loader2 } from "lucide-react";

interface Props {
    defaultValue?: string;
    onUploadSuccess: (url: string) => void;
}

export default function AvatarUpload({ defaultValue, onUploadSuccess }: Props) {
    const [preview, setPreview] = useState(defaultValue || "");
    const [uploading, setUploading] = useState(false);
    const supabase = createSupabaseBrowserClient();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!e.target.files || e.target.files.length === 0) return;

            const file = e.target.files[0];
            const fileExt = file.name.split(".").pop();
            const fileName = `${uuidv4()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(fileName);

            setPreview(publicUrl);
            onUploadSuccess(publicUrl);
        } catch (error: any) {
            alert("Lỗi tải ảnh: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
            <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-white">
                    {preview ? (
                        <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-200">
                            <Camera size={48} />
                        </div>
                    )}
                </div>

                {uploading && (
                    <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-600" />
                    </div>
                )}

                <label className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white cursor-pointer shadow-lg hover:bg-blue-700 transition-transform active:scale-95">
                    <Camera size={16} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                </label>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">PNG, JPG tối đa 5MB</p>
        </div>
    );
}