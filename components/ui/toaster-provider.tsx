"use client";

import dynamic from "next/dynamic";

// Ép buộc Next.js chỉ import và render Sonner ở phía Client
const Toaster = dynamic(
    () => import("sonner").then((mod) => mod.Toaster),
    { ssr: false }
);

export function ToasterProvider() {
    return <Toaster position="top-right" richColors closeButton />;
}