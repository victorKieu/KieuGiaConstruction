import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getProject } from "@/lib/action/projectActions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Plus } from "lucide-react"
import { ProjectTaskList } from "@/components/projects/project-task-list"

export default async function ProjectTasksPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-4">
      <Suspense fallback={<TasksPageSkeleton />}>
        <ProjectTasksContent id={params.id} />
      </Suspense>
    </div>
  )
}

async function ProjectTasksContent({ id }: { id: string }) {
  let project

  try {
    project = await getProject(id)
  } catch (err: unknown) { // Thay đổi ở đây
      if (err instanceof Error) {
          console.error("Đã xảy ra lỗi:", err.message);
      } else {
          console.error("Đã xảy ra lỗi không xác định:", err);
      }
  }

  if (!project) {
    notFound()
  }

  // Giả lập dữ liệu công việc
  const tasks = [
    {
      id: "1",
      title: "Khảo sát địa điểm",
      description: "Khảo sát và đánh giá địa điểm xây dựng",
      status: "completed",
      priority: "high",
      assignee: "Nguyễn Văn A",
      due_date: "2023-06-15",
      progress: 100,
    },
    {
      id: "2",
      title: "Thiết kế kiến trúc",
      description: "Thiết kế bản vẽ kiến trúc chi tiết",
      status: "in_progress",
      priority: "high",
      assignee: "Trần Thị B",
      due_date: "2023-07-30",
      progress: 65,
    },
    {
      id: "3",
      title: "Thiết kế kết cấu",
      description: "Thiết kế bản vẽ kết cấu chi tiết",
      status: "in_progress",
      priority: "medium",
      assignee: "Lê Văn C",
      due_date: "2023-08-15",
      progress: 40,
    },
    {
      id: "4",
      title: "Lập dự toán chi tiết",
      description: "Lập dự toán chi tiết cho dự án",
      status: "pending",
      priority: "medium",
      assignee: "Phạm Thị D",
      due_date: "2023-08-30",
      progress: 0,
    },
    {
      id: "5",
      title: "Xin giấy phép xây dựng",
      description: "Hoàn thiện hồ sơ và xin giấy phép xây dựng",
      status: "delayed",
      priority: "high",
      assignee: "Nguyễn Văn A",
      due_date: "2023-07-15",
      progress: 50,
    },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href={`/projects/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Công việc dự án: {project.name}</h1>
            <p className="text-sm text-gray-500">Quản lý và theo dõi các công việc trong dự án</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/projects/${id}/tasks/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm công việc
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="pending">Chờ xử lý</TabsTrigger>
          <TabsTrigger value="in_progress">Đang làm</TabsTrigger>
          <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
          <TabsTrigger value="delayed">Chậm tiến độ</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách công việc</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectTaskList tasks={tasks} projectId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Công việc chờ xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectTaskList tasks={tasks.filter((task) => task.status === "pending")} projectId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in_progress">
          <Card>
            <CardHeader>
              <CardTitle>Công việc đang làm</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectTaskList tasks={tasks.filter((task) => task.status === "in_progress")} projectId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Công việc hoàn thành</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectTaskList tasks={tasks.filter((task) => task.status === "completed")} projectId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delayed">
          <Card>
            <CardHeader>
              <CardTitle>Công việc chậm tiến độ</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectTaskList tasks={tasks.filter((task) => task.status === "delayed")} projectId={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}

function TasksPageSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Skeleton className="h-10 w-10 mr-4" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <Skeleton className="h-12 w-full mb-4" />

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
