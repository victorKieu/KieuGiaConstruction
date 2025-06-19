import type React from "react";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen h-full w-full flex flex-col overflow-hidden">{children}</div>;
}