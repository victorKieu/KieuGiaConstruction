"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global application error:", error);
    }, [error]);

    // Kiểm tra xem lỗi có phải là lỗi redirect không
    if (error.message === "NEXT_REDIRECT" || error.message.includes("redirect")) {
        // Nếu là lỗi redirect, không hiển thị gì cả và để Next.js xử lý redirect
        return null;
    }

    return (
        <html>
            <body>
                <div className="flex items-center justify-center min-h-screen bg-gray-100">
                    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                        <div className="flex justify-center mb-6">
                            <div className="bg-red-100 p-3 rounded-full">
                                <AlertCircle className="h-10 w-10 text-red-500" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-center mb-2">Lỗi hệ thống</h1>
                        <p className="text-gray-500 text-center mb-6">
                            Đã xảy ra lỗi nghiêm trọng. Vui lòng thử lại sau hoặc liên hệ quản trị viên.
                        </p>
                        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800 mb-6">
                            <p className="font-medium">Thông tin lỗi:</p>
                            <p className="mt-1">{error.message || "Lỗi không xác định"}</p>
                            {error.digest && (
                                <p className="mt-1">
                                    Mã lỗi: <code className="bg-red-100 px-1 py-0.5 rounded">{error.digest}</code>
                                </p>
                            )}
                        </div>
                        <div className="flex justify-center">
                            <Button onClick={reset} className="flex items-center">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Thử lại
                            </Button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}