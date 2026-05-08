"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useTranslation } from 'next-i18next';
import i18next from '@/app/src/config/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Palette, Globe, Bell, Moon, Sun, Monitor } from "lucide-react";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();

    // Xử lý Hydration mismatch với next-themes (Ngăn lỗi giật giao diện khi load)
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const changeLanguage = (locale: string) => {
        if (i18next && typeof i18next.changeLanguage === 'function') {
            i18next.changeLanguage(locale);
        }
    };

    // Nếu chưa load xong component thì render màn hình trống đúng màu nền để tránh giật (FOUC)
    if (!mounted) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors" />;

    return (
        <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-4 md:p-8 min-h-[calc(100vh-4rem)] transition-colors duration-300">
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">

                {/* Tiêu đề trang */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">
                        {t("settings") || "Cài đặt cá nhân"}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">
                        Quản lý giao diện, ngôn ngữ và các tùy chọn cá nhân của hệ thống.
                    </p>
                </div>

                <Tabs defaultValue="appearance" className="w-full">
                    {/* Thanh Menu Tabs */}
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-slate-200/50 dark:bg-slate-800 transition-colors">
                        <TabsTrigger value="account" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white">
                            <User className="w-4 h-4 mr-2" /> Tài khoản
                        </TabsTrigger>
                        <TabsTrigger value="appearance" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white">
                            <Palette className="w-4 h-4 mr-2" /> Giao diện
                        </TabsTrigger>
                        <TabsTrigger value="language" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white">
                            <Globe className="w-4 h-4 mr-2" /> Ngôn ngữ
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white">
                            <Bell className="w-4 h-4 mr-2" /> Thông báo
                        </TabsTrigger>
                    </TabsList>

                    {/* ======================================================== */}
                    {/* TAB GIAO DIỆN (DARK MODE) */}
                    {/* ======================================================== */}
                    <TabsContent value="appearance" className="mt-6">
                        <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-950 transition-colors shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-slate-800 dark:text-slate-200">Giao diện (Theme)</CardTitle>
                                <CardDescription className="text-slate-500 dark:text-slate-400">
                                    Tùy chỉnh màu sắc hệ thống phù hợp với môi trường làm việc của bạn.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Nút: Sáng */}
                                    <button
                                        onClick={() => setTheme("light")}
                                        className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 ${theme === 'light'
                                                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                            }`}
                                    >
                                        <Sun className={`w-8 h-8 mb-3 transition-colors ${theme === 'light' ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400'}`} />
                                        <span className={`font-semibold text-sm ${theme === 'light' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                            Chế độ Sáng
                                        </span>
                                    </button>

                                    {/* Nút: Tối */}
                                    <button
                                        onClick={() => setTheme("dark")}
                                        className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 ${theme === 'dark'
                                                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                            }`}
                                    >
                                        <Moon className={`w-8 h-8 mb-3 transition-colors ${theme === 'dark' ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400'}`} />
                                        <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                            Chế độ Tối
                                        </span>
                                    </button>

                                    {/* Nút: Hệ thống */}
                                    <button
                                        onClick={() => setTheme("system")}
                                        className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 ${theme === 'system'
                                                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                            }`}
                                    >
                                        <Monitor className={`w-8 h-8 mb-3 transition-colors ${theme === 'system' ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400'}`} />
                                        <span className={`font-semibold text-sm ${theme === 'system' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                            Theo hệ điều hành
                                        </span>
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ======================================================== */}
                    {/* TAB NGÔN NGỮ */}
                    {/* ======================================================== */}
                    <TabsContent value="language" className="mt-6">
                        <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-950 transition-colors shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-slate-800 dark:text-slate-200">Ngôn ngữ (Language)</CardTitle>
                                <CardDescription className="text-slate-500 dark:text-slate-400">
                                    Thay đổi ngôn ngữ hiển thị trên toàn hệ thống.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col space-y-3 max-w-md">
                                    <Button
                                        variant="outline"
                                        onClick={() => changeLanguage('vi')}
                                        className="justify-start h-14 border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 text-base"
                                    >
                                        <span className="text-2xl mr-4">🇻🇳</span> Tiếng Việt
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => changeLanguage('en')}
                                        className="justify-start h-14 border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 text-base"
                                    >
                                        <span className="text-2xl mr-4">🇺🇸</span> English (US)
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ======================================================== */}
                    {/* TAB TÀI KHOẢN */}
                    {/* ======================================================== */}
                    <TabsContent value="account" className="mt-6">
                        <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-950 transition-colors shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-slate-800 dark:text-slate-200">Hồ sơ cá nhân</CardTitle>
                                <CardDescription className="text-slate-500 dark:text-slate-400">
                                    Thông tin định danh được liên kết với tài khoản của bạn.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                                    <p className="text-blue-800 dark:text-blue-300 text-sm leading-relaxed">
                                        Dữ liệu hồ sơ nhân sự (Bao gồm số điện thoại, mật khẩu, CCCD) được quản lý tập trung.
                                        Vui lòng liên hệ Bộ phận Hành chính Nhân sự (HR) để thay đổi các thông tin bảo mật.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ======================================================== */}
                    {/* TAB THÔNG BÁO */}
                    {/* ======================================================== */}
                    <TabsContent value="notifications" className="mt-6">
                        <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-950 transition-colors shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-slate-800 dark:text-slate-200">Tùy chọn thông báo</CardTitle>
                                <CardDescription className="text-slate-500 dark:text-slate-400">
                                    Quản lý cách bạn nhận các cảnh báo từ hệ thống ứng dụng.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center">
                                    <Bell className="w-5 h-5 mr-3 text-slate-500 dark:text-slate-400" />
                                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                                        Hệ thống đã tự động bật thông báo đẩy (Push Notifications) cho Đơn từ và Chấm công theo thời gian thực.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>
        </div>
    );
}