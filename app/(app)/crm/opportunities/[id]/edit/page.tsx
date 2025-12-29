import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OpportunityForm } from "@/components/crm/opportunities/opportunity-form";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditOpportunityPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: opportunity, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !opportunity) {
        notFound();
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight">Cập nhật cơ hội</h2>
            <OpportunityForm
                initialData={opportunity}
                opportunityId={id}
            />
        </div>
    );
}