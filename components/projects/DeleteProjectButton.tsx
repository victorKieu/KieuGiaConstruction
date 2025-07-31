// components/projects/DeleteProjectButton.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface DeleteProjectButtonProps {
    projectId: string
    projectName: string
    onSuccess?: () => void
}

export function DeleteProjectButton({ projectId, projectName, onSuccess }: DeleteProjectButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const handleDelete = async () => {
        if (!confirm(`Bạn có chắc chắn muốn xóa dự án "${projectName}"? Hành động này không thể hoàn tác.`)) return

        setIsDeleting(true)

        try {
            const response = await fetch("/api/projects/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || `Lỗi HTTP: ${response.status}`)
            }

            const result = await response.json()

            if (result.success) {
                toast({
                    title: "Xóa thành công",
                    description: `Dự án "${projectName}" đã được xóa.`,
                })
                if (onSuccess) onSuccess()
                else router.push("/projects")
            } else {
                throw new Error(result.error || "Không thể xóa dự án")
            }
        } catch (error: any) {
            toast({
                title: "Lỗi",
                description: error.message || "Đã xảy ra lỗi không mong muốn.",
                variant: "destructive",
            })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xóa...
                </>
            ) : (
                <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Xóa dự án
                </>
            )}
        </Button>
    )
}
