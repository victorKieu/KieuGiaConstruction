"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import supabase from '@/lib/supabase/client';
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar, Phone, Users } from "lucide-react"

interface Activity {
  id: string
  customer_id: string
  customer_name: string
  type: string
  title: string
  description: string
  scheduled_at: string
  status: string
}

const activityIcons: Record<string, any> = {
  call: Phone,
  meeting: Users,
  task: Calendar,
}

export function UpcomingActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUpcomingActivities() {
      try {
        //const supabase = createClient()

        // Lấy hoạt động sắp tới trong 7 ngày
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)

        const { data, error } = await supabase
          .from("customer_activities")
          .select(`
            id, 
            type, 
            title, 
            description, 
            scheduled_at, 
            status,
            customer_id,
            customers (name)
          `)
          .gte("scheduled_at", new Date().toISOString())
          .lte("scheduled_at", nextWeek.toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(5)

        if (error) throw error

        // Chuyển đổi dữ liệu
          const formattedActivities = data.map((item) => ({
              id: item.id,
              customer_id: item.customer_id,
              customer_name: Array.isArray(item.customers) && item.customers.length > 0
                  ? item.customers.map(c => c.name).join(", ")
                  : "Khách hàng không xác định",
              type: item.type,
              title: item.title,
              description: item.description,
              scheduled_at: item.scheduled_at,
              status: item.status,
          }))

        setActivities(formattedActivities)
      } catch (error) {
          // Trong components/crm/upcoming-activities.tsx
          async function fetchUpcomingActivities() {
              //const supabase = createClient(); // Hoặc cách bạn lấy client client-side
              const { data, error } = await supabase
                  .from('customer_activities')
                  .select('id, title, description, scheduled_at, status, customer_id, customers(name)') // Đảm bảo select đúng cột
                  .gte('scheduled_at', new Date().toISOString()) // Ví dụ lọc ngày
                  .lte('scheduled_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) // Ví dụ lọc 7 ngày tới
                  .order('scheduled_at', { ascending: true })
                  .limit(5);

              if (error) {
                  console.error('Error fetching upcoming activities:');
                  console.error('  Message:', error.message);
                  console.error('  Code:', error.code);
                  console.error('  Details:', error.details);
                  console.error('  Hint:', error.hint);
                  // Log toàn bộ object error như fallback
                  console.error('  Full error object:', error);
                  // Trả về null hoặc throw error để component gọi xử lý
                  return null;
              }

              return data;
          }
      } finally {
        setIsLoading(false)
      }
    }

    fetchUpcomingActivities()
  }, [])

  if (isLoading) {
    return <div>Loading upcoming activities...</div>
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Không có hoạt động nào được lên lịch trong 7 ngày tới
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {activities.map((activity) => {
        const ActivityIcon = activityIcons[activity.type] || Calendar
        const initials = activity.customer_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2)

        return (
          <div key={activity.id} className="flex items-start">
            <Avatar className="h-9 w-9 mr-4">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center">
                <ActivityIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-sm font-medium">{activity.title}</p>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
              <div className="flex items-center text-xs text-muted-foreground">
                <span>{format(new Date(activity.scheduled_at), "PPp", { locale: vi })}</span>
                <span className="mx-2">•</span>
                <span>{activity.customer_name}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="ml-auto">
              Chi tiết
            </Button>
          </div>
        )
      })}
    </div>
  )
}
