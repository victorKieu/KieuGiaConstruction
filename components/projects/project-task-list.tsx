"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Edit, MoreHorizontal, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  assignee: string
  due_date: string
  progress: number
}

interface ProjectTaskListProps {
  tasks: Task[]
  projectId: string
}

export function ProjectTaskList({ tasks, projectId }: ProjectTaskListProps) {
  const [taskList, setTaskList] = useState<Task[]>(tasks)

  // Xử lý khi đánh dấu hoàn thành công việc
  const handleTaskComplete = (taskId: string) => {
    setTaskList((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            status: task.status === "completed" ? "in_progress" : "completed",
            progress: task.status === "completed" ? 90 : 100,
          }
        }
        return task
      }),
    )
  }

  // Định dạng ngày
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  // Xác định màu sắc cho trạng thái
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-gray-500">Chờ xử lý</Badge>
      case "in_progress":
        return <Badge className="bg-blue-500">Đang làm</Badge>
      case "completed":
        return <Badge className="bg-green-500">Hoàn thành</Badge>
      case "delayed":
        return <Badge className="bg-red-500">Chậm tiến độ</Badge>
      default:
        return <Badge className="bg-gray-500">Không xác định</Badge>
    }
  }

  // Xác định màu sắc cho mức độ ưu tiên
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            Thấp
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            Trung bình
          </Badge>
        )
      case "high":
        return (
          <Badge variant="outline" className="border-red-500 text-red-500">
            Cao
          </Badge>
        )
      default:
        return <Badge variant="outline">Không xác định</Badge>
    }
  }

  if (taskList.length === 0) {
    return <div className="text-center py-8 text-gray-500">Không có công việc nào</div>
  }

  return (
    <div className="space-y-4">
      {taskList.map((task) => (
        <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-start gap-4">
            <Checkbox
              checked={task.status === "completed"}
              onCheckedChange={() => handleTaskComplete(task.id)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{task.title}</h3>
                  {getStatusBadge(task.status)}
                  {getPriorityBadge(task.priority)}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/${projectId}/tasks/${task.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm text-gray-500 mt-1">{task.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                <div>Người thực hiện: {task.assignee}</div>
                <div>Hạn hoàn thành: {formatDate(task.due_date)}</div>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Tiến độ</span>
                  <span>{task.progress}%</span>
                </div>
                <Progress value={task.progress} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
