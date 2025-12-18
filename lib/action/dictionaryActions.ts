import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export type DictionaryLabel = {
    code: string;
    label: string;
    extra?: Record<string, any>;
};

/**
 * Lấy danh sách nhãn theo loại danh mục và ngôn ngữ
 * @param category - ví dụ: "project_status"
 * @param lang - "vi" hoặc "en"
 */
export async function getDictionaryLabels(
    category: string,
    lang: "vi" | "en" = "vi"
): Promise<DictionaryLabel[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("system_dictionary")
        .select("code, label_vi, label_en, extra")
        .eq("category", category)
        .eq("is_active", true);

    if (error) throw new Error(error.message);

    return data.map((item) => ({
        code: item.code,
        label: lang === "vi" ? item.label_vi : item.label_en,
        extra: item.extra ?? {},
    }));
}

/**
 * Tìm nhãn theo mã và danh sách đã lấy
 */
export function getLabelFromList(
    code: string,
    list: DictionaryLabel[]
): string {
    return list.find((item) => item.code === code)?.label ?? "Không xác định";
}

/**
 * Lọc danh sách theo điều kiện trong extra
 * @param list - danh sách đã lấy
 * @param key - ví dụ: "affects_weather"
 */
export function filterByExtraFlag(
    list: DictionaryLabel[],
    key: string
): string[] {
    return list
        .filter((item) => item.extra?.[key])
        .map((item) => item.code);
}