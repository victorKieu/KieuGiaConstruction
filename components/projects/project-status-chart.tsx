"use client"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { useEffect, useState } from "react"

interface ChartData {
  name: string
  value: number
  color: string
  percentage?: number
}

interface Project {
  id: string
  status: string | null
  // Các trường khác của project
}

interface ProjectStatusChartProps {
  projects?: Project[]
  data?: ChartData[]
  centerText?: string
  type?: "pie" | "donut"
}

// Hàm để tạo dữ liệu biểu đồ từ danh sách dự án
function createChartDataFromProjects(projects: Project[] = []): ChartData[] {
  const statusCounts: Record<string, number> = {
    planning: 0,
    in_progress: 0,
    paused: 0,
    completed: 0,
  }

  // Đếm số lượng dự án theo trạng thái
  projects.forEach((project) => {
    const status = project.status || "planning"
    if (statusCounts[status] !== undefined) {
      statusCounts[status]++
    }
  })

  // Tạo dữ liệu biểu đồ
  return [
    { name: "Kế hoạch", value: statusCounts.planning, color: "#3B82F6" },
    { name: "Đang làm", value: statusCounts.in_progress, color: "#10B981" },
    { name: "Tạm dừng", value: statusCounts.paused, color: "#F59E0B" },
    { name: "Hoàn thành", value: statusCounts.completed, color: "#6366F1" },
  ].filter((item) => item.value > 0) // Chỉ hiển thị các trạng thái có dự án
}

// Dữ liệu mẫu cho biểu đồ
const defaultData = [
  { name: "Kế hoạch", value: 5, color: "#3B82F6" },
  { name: "Đang làm", value: 12, color: "#10B981" },
  { name: "Tạm dừng", value: 3, color: "#F59E0B" },
  { name: "Hoàn thành", value: 8, color: "#6366F1" },
]

// Sửa lại export để sử dụng named export
export function ProjectStatusChart({ projects, data, centerText, type = "donut" }: ProjectStatusChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Xác định dữ liệu biểu đồ
    if (data) {
      setChartData(data)
    } else if (projects && projects.length > 0) {
      setChartData(createChartDataFromProjects(projects))
    } else {
      setChartData(defaultData)
    }

    return () => {
      setMounted(false)
    }
  }, [data, projects])

  // Không render gì nếu không có dữ liệu hoặc component chưa được mount
  if (!mounted || chartData.length === 0) {
    return <div className="flex items-center justify-center h-full">Không có dữ liệu</div>
  }

  // Tính toán innerRadius dựa trên loại biểu đồ
  const innerRadius = type === "donut" ? 60 : 0
  const outerRadius = 80

  return (
    <div className="w-full h-full" style={{ minHeight: "200px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} dự án`, "Số lượng"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Giữ lại default export cho khả năng tương thích ngược
export default function DefaultProjectStatusChart(props: ProjectStatusChartProps) {
  return <ProjectStatusChart {...props} />
}
