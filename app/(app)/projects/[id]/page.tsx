import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getProject } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
//import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { DeleteProjectButton } from "@/components/projects/DeleteProjectButton"
import ProjectTabs from "@/components/projects/ProjectTabs";
import {
    ArrowLeft,
    Edit,
    Clock,
    DollarSign,
    ListTodo,
    ShieldAlert,
} from "lucide-react"

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
    return (
        <div className="container mx-auto p-4">
            <Suspense fallback={<ProjectDetailSkeleton />}>
                <ProjectDetail id={params.id} />
            </Suspense>
        </div>
    )
}

async function ProjectDetail({ id }: { id: string }) {
    if (!id) notFound()
    try {
        const project = await getProject(id)
        if (project && "isSpecialRoute" in project && project.isSpecialRoute) {
            if (project.type === "warranty") {
                return <WarrantyPage />
            }
            notFound()
        }

        if (project && "error" in project) {
            return <ProjectError error={project.error} code={project.code} id={id} />
        }

        if (!project) {
            console.error("[ProjectDetail] getProject trả về:", project)
            notFound()
        }

        // Format dates
        const formatDate = (dateString: string | null) => {
            if (!dateString) return "N/A"
            return new Date(dateString).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
        }

        // Xác định trạng thái
        const getStatusBadge = (status: string | null) => {
            switch (status) {
                case "planning":
                    return <Badge className="bg-blue-500">Kế hoạch</Badge>
                case "in_progress":
                    return <Badge className="bg-green-500">Đang làm</Badge>
                case "paused":
                    return <Badge className="bg-yellow-500">Tạm dừng</Badge>
                case "completed":
                    return <Badge className="bg-purple-500">Hoàn thành</Badge>
                default:
                    return <Badge className="bg-gray-500">Không xác định</Badge>
            }
        }

        const getRiskBadge = (risk: string | null) => {
            switch (risk) {
                case "normal":
                    return <Badge className="bg-green-500">Bình thường</Badge>
                case "accelerated":
                    return <Badge className="bg-blue-500">Tăng tốc</Badge>
                case "delayed":
                    return <Badge className="bg-yellow-500">Lùi ý</Badge>
                case "at_risk":
                    return <Badge className="bg-red-500">Rủi ro</Badge>
                case "behind":
                    return <Badge className="bg-purple-500">Chậm trễ</Badge>
                default:
                    return <Badge className="bg-gray-500">Không xác định</Badge>
            }
        }

        const planProgress = project.progress || 0
        const actualProgress = (project.progress || 0) * 0.8 // Giả định tiến độ thực tế

        // Lấy đúng tên khách hàng, quản lý, địa chỉ
        const customerName = project.customers?.name || "Chưa có thông tin"
        const projectManagerName = project.manager?.name || "Chưa phân công"
        const address = project.address || "Chưa có thông tin"

        return (
            <>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <Button variant="outline" size="icon" asChild className="mr-4">
                            <Link href="/projects">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">{project.name}</h1>
                            <div className="flex items-center mt-1 text-sm text-gray-500">
                                <span>Mã dự án: {project.code}</span>
                                <span className="mx-2">•</span>
                                <span>Trạng thái: {getStatusBadge(project.status)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <Button asChild variant="outline">
                            <Link href={`/projects/${id}/tasks`}>
                                <ListTodo className="h-4 w-4 mr-2" />
                                Công việc
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={`/projects/${id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Chỉnh sửa
                            </Link>
                        </Button>
                        <DeleteProjectButton projectId={id} projectName={project.name} />
                    </div>
                </div>

                <ProjectTabs projectId={id} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card>
                        <CardContent className="p-4 flex items-center">
                            <div className="mr-4 p-2 bg-blue-100 rounded-full">
                                <Clock className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Thời gian</p>
                                <p className="font-medium">
                                    {formatDate(project.start_date)} - {formatDate(project.end_date)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex items-center">
                            <div className="mr-4 p-2 bg-amber-100 rounded-full">
                                <DollarSign className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Ngân sách</p>
                                <p className="font-medium">{formatCurrency(project.budget || 0)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-gray-500 mb-1">Tiến độ</p>
                            <div className="flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                                </div>
                                <span className="text-sm font-medium">{project.progress || 0}%</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </>
        )
    } catch (err: unknown) { // Thay đổi ở đây
        if (err instanceof Error) {
            console.error("Đã xảy ra lỗi:", err.message);
        } else {
            console.error("Đã xảy ra lỗi không xác định:", err);
        }
        //return <ProjectError error={error?.message || JSON.stringify(error) || "Đã xảy ra lỗi"} code="unknown_error" id={id} />
    }
}

// Component skeleton loading
function ProjectDetailSkeleton() {
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
                <div className="flex space-x-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>

            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-64 w-full mb-6" />
            <Skeleton className="h-64 w-full" />
        </>
    )
}

// Component hiển thị lỗi
function ProjectError({ error, code, id }: { error: string; code: string; id: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10">
            <div className="bg-red-100 border border-red-200 rounded-full p-4 mb-4">
                <ShieldAlert className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Không thể tải thông tin dự án</h2>
            <p className="text-gray-500 mb-6 text-center max-w-md">{error}</p>
            <div className="flex gap-4">
                <Button asChild variant="outline">
                    <Link href="/projects">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Quay lại danh sách dự án
                    </Link>
                </Button>
                {code === "invalid_uuid" && (
                    <Button asChild>
                        <Link href="/projects/new">
                            <Edit className="h-4 w-4 mr-2" />
                            Tạo dự án mới
                        </Link>
                    </Button>
                )}
            </div>
            {code === "invalid_uuid" && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md max-w-lg">
                    <p className="text-amber-800 text-sm">
                        <strong>Lưu ý:</strong> ID dự án "{id}" không đúng định dạng UUID. ID dự án phải là một chuỗi có định dạng
                        như "123e4567-e89b-12d3-a456-426614174000".
                    </p>
                </div>
            )}
        </div>
    )
}

// Component trang bảo hành
function WarrantyPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <Button variant="outline" size="icon" asChild className="mr-4">
                        <Link href="/projects">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Quản lý bảo hành</h1>
                </div>
                <Button>
                    <Edit className="h-4 w-4 mr-2" />
                    Thêm bảo hành mới
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách bảo hành</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-500">Chức năng quản lý bảo hành đang được phát triển.</p>
                    <p className="text-gray-500 mt-2">
                        Tính năng này sẽ cho phép bạn theo dõi và quản lý các bảo hành cho các dự án đã hoàn thành.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}