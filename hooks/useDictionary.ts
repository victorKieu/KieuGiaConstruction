"use client";

import { useState, useEffect } from "react";
import { getDictionariesByCategories, type DictionaryItem } from "@/lib/action/dictionaryActions";

export function useDictionary(categories: string[]) {
    // State lưu trữ dữ liệu dictionary đã được gom nhóm
    const [dicts, setDicts] = useState<Record<string, DictionaryItem[]>>({});
    const [loading, setLoading] = useState<boolean>(true);

    // Dùng JSON.stringify để tránh hook gọi API liên tục (re-render loop) khi mảng categories không thay đổi giá trị
    const categoriesKey = JSON.stringify(categories);

    useEffect(() => {
        let isMounted = true;

        const fetchDicts = async () => {
            setLoading(true);
            const parsedCategories = JSON.parse(categoriesKey);

            if (parsedCategories.length === 0) {
                setLoading(false);
                return;
            }

            const res = await getDictionariesByCategories(parsedCategories);

            if (isMounted && res.success && res.data) {
                setDicts(res.data);
            }
            if (isMounted) {
                setLoading(false);
            }
        };

        fetchDicts();

        return () => {
            isMounted = false;
        };
    }, [categoriesKey]);

    return { dicts, loading };
}