"use client";
import type { ReactNode } from "react";
import PublicLayout from "@/components/layouts/public-layout";

export default function PublicLayoutWrapper({ children }: { children: ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}