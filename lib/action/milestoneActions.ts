import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function getProjectMilestones(projectId: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("project_milestones")
        .select("milestone, description, planned_start_date")
        .eq("project_id", projectId)
        .order("planned_start_date", { ascending: true });

    if (error) {
        console.error("Lỗi lấy mốc thời gian:", error.message);
        return [];
    }

    return data.map(m => ({
        date: m.planned_start_date,
        title: m.milestone,
        description: m.description,
    }));
}