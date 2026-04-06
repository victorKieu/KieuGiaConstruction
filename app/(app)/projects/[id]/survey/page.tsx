'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation'; // ✅ Dùng useRouter để chuyển trang mượt hơn
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const SurveyList = () => {
    const pathname = usePathname();
    const router = useRouter();
    const projectId = pathname.split('/')[3];
    const [surveys, setSurveys] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSurveys = async () => {
            setIsLoading(true);
            try {
                if (projectId) {
                    const response = await fetch(`/api/projects/${projectId}/surveys`);
                    const data = await response.json();
                    setSurveys(data);
                }
            } catch (error) {
                console.error("Lỗi khi tải danh sách khảo sát:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSurveys();
    }, [projectId]);

    const handleAddSurvey = () => {
        // Dùng router.push để không bị load lại trang trắng
        router.push(`${pathname}/survey/new`);
    };

    return (
        <div className="container mx-auto py-8 animate-in fade-in duration-500 transition-colors">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Danh sách Khảo sát</h2>
                <Button onClick={handleAddSurvey} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                    Thêm mới khảo sát
                </Button>
            </div>

            <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800 transition-colors">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">STT</th>
                                <th className="px-4 py-3 whitespace-nowrap">Ngày khảo sát</th>
                                <th className="px-4 py-3 min-w-[200px]">Nội dung khảo sát</th>
                                <th className="px-4 py-3 whitespace-nowrap">Nhân viên</th>
                                <th className="px-4 py-3 whitespace-nowrap">Đánh giá</th>
                                <th className="px-4 py-3 whitespace-nowrap">Kết quả</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : surveys.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                        Chưa có dữ liệu khảo sát nào.
                                    </td>
                                </tr>
                            ) : (
                                surveys.map((survey, index) => (
                                    <tr key={survey.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{index + 1}</td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                            {survey.survey_date ? new Date(survey.survey_date).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium">{survey.content || '---'}</td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{survey.staff || '---'}</td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{survey.evaluation || '---'}</td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{survey.results || '---'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/app/projects/${projectId}/surveys/${survey.id}`)}
                                                className="dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                Xem
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default SurveyList;