// app/settings/page.tsx
"use client";

import React from "react";
import { useTheme } from "next-themes";
import { useTranslation } from 'next-i18next';
import i18next from '@/app/src/config/i18n';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();

    const toggleDarkMode = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const changeLanguage = (locale: string) => {
        i18next.changeLanguage(locale);
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-2xl font-bold mb-4">{t("settings")}</h1>

            {/* Dark Mode */}
            <div className="mb-4">
                <button
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                    onClick={toggleDarkMode}
                    aria-label="Chuyển theme"
                >
                    {theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
                </button>
            </div>

            {/* Language Switcher */}
            <div>
                <button
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 mr-2"
                    onClick={() => changeLanguage('vi')}
                    aria-label="Chuyển sang tiếng Việt"
                >
                    Tiếng Việt
                </button>
                <button
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                    onClick={() => changeLanguage('en')}
                    aria-label="Chuyển sang tiếng Anh"
                >
                    English
                </button>
            </div>
        </div>
    );
}