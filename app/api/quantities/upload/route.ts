import { createRouteHandlerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import xlsx from "node-xlsx"

//export const config = { api: { bodyParser: false } }

export async function POST(request: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("file") as File
    const projectId = formData.get("projectId")

    if (!file || !projectId) {
        return NextResponse.json({ error: "Thiếu file hoặc projectId" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const sheets = xlsx.parse(buffer)
    const rows = sheets[0].data

    const workItems = rows.slice(1).map(row => ({
        work_item: row[0] || "",
        unit: row[1] || "",
        quantity: Number(row[2]) || 0,
        description: row[3] || "",
        project_id: projectId,
        source: "auto",
        created_by: session.user.id,
    }))

    const { data, error } = await supabase.from("quantities").insert(workItems)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
}