"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { NewOpportunityForm } from "@/components/opportunities/new-opportunity-form";

export default function NewOpportunityPage() {
    return (
        <div>
            <h1>Thêm cơ hội mới</h1>
            <NewOpportunityForm />
        </div>
    );
}
export function NewOpportunityForm() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [stage, setStage] = useState("lead");
    const [estimatedValue, setEstimatedValue] = useState(0);
    const [probability, setProbability] = useState(0);
    const [expectedCloseDate, setExpectedCloseDate] = useState("");
    const [customerId, setCustomerId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await fetch("/api/opportunities/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    description,
                    stage,
                    estimatedValue,
                    probability,
                    expectedCloseDate,
                    customerId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Có lỗi xảy ra khi tạo cơ hội.");
            }

            router.push("/crm/opportunities");
        } catch (err: any) {
            setError(err.message || "Có lỗi xảy ra khi tạo cơ hội.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="grid gap-4">
                <div>
                    <Label htmlFor="title">Tiêu đề</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                {/* Thêm các trường khác */}
                <Button disabled={loading}>{loading ? "Đang tạo..." : "Tạo cơ hội"}</Button>
                {error && <p className="text-red-500">{error}</p>}
            </div>
        </form>
    );
}