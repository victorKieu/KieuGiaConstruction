"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import supabase from '@/lib/supabase/client';

interface DeleteProjectDialogProps {
  projectId: string
  projectName: string
  variant?: "outline" | "destructive" | "default"
  size?: "icon" | "default" | "sm"
  trigger?: React.ReactNode
}

export function DeleteProjectDialog({
  projectId,
  projectName,
  variant = "destructive",
  size = "sm",
  trigger,
}: DeleteProjectDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!projectId) {
      toast({
        title: "Lỗi",
        description: "ID dự án không hợp lệ",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    console.log("Đang xóa dự án với ID:", projectId)

    try {
      
      // Xóa dự án
        const { error } = await supabase.from("projects").delete().eq("id", projectId)
        if (error) {
            let msg = error.message;
            if (msg.includes("permission denied") || msg.includes("row-level security policy")) {
                msg = "Bạn không có quyền xóa dự án này."
            }
            toast({
                title: "Lỗi",
                description: msg,
                variant: "destructive",
            })
            return;
        }

      // Chuyển hướng về trang danh sách dự án
      setTimeout(() => {
        window.location.href = "/projects"
      }, 500)
    } catch (error) {
      console.error("Lỗi xử lý:", error)
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const defaultTrigger = (
    <Button variant={variant} size={size}>
      {size === "icon" ? (
        <Trash2 className="h-4 w-4" />
      ) : (
        <>
          <Trash2 className="h-4 w-4 mr-2" />
          Xóa dự án
        </>
      )}
    </Button>
  )

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger || defaultTrigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bạn có chắc chắn muốn xóa dự án này?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này không thể hoàn tác. Dự án <span className="font-semibold">{projectName}</span> sẽ bị xóa vĩnh
            viễn khỏi hệ thống.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xóa...
              </>
            ) : (
              "Xóa dự án"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
