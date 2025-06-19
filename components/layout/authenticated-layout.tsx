"use client";

import type React from "react";
import { SidebarWrapper } from "@/components/sidebar";
import Header from "@/components/header";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full">
      <SidebarWrapper>
        <Header />
        <main className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6">{children}</main>
      </SidebarWrapper>
    </div>
  );
}