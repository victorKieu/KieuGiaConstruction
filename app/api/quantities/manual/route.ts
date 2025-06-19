import { createRouteHandlerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies })
    const { workItems, projectId } = await request.json()
    if (!projectId || !Array.isArray(workItems)) {
        return NextResponse.json({ error: "Thiếu dữ liệu đầu vào" }, { status: 400 })
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const insertData = workItems.map(item => ({
        ...item,
        project_id: projectId,
        source: "manual",
        created_by: session.user.id,
    }))
    const { data, error } = await supabase.from("quantities").insert(insertData)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
}