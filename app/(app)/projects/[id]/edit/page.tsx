import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProjectForm from '@/components/projects/ProjectForm';
import { cookies } from "next/headers";

export default async function EditProjectPage({ params }: { params: { id: string } }) {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", params.id)
        .single();

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    if (!project) {
        return <div>Project not found</div>;
    }

    const { data: customers } = await supabase.from("customers").select("id, name");
    const { data: managers } = await supabase.from("users").select("id, name");

    return (
        <ProjectForm
            initialData={project}
            customers={customers ?? []}
            managers={managers ?? []}
        />
    );
}