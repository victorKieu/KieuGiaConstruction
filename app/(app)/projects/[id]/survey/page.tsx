'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Survey {
    id: string | number;
    survey_date?: string;
    content?: string;
    staff?: string;
    evaluation?: string;
    results?: string;
}

const SurveyList = () => {
    const pathname = usePathname();
    const router = useRouter();
    const params = useParams();

    // Lấy projectId an toàn từ useParams()
    const projectId = params?.id || params?.projectId;

    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchSurveys = async () => {
            if (!projectId) return;

            setIsLoading(true);
            try {
                const response = await fetch(`/api/projects/${projectId}/surveys`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                if (isMounted) {
                    setSurveys(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Lỗi khi tải danh sách khảo sát:", error);
                if (isMounted) setSurveys([]);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchSurveys();

        return () => {
            isMounted = false;
        };
    }, [projectId]);

    const handleAddSurvey = () => {
        router.push(`${pathname}/survey/new`);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('vi-VN');
    };

    return (
        <div className="animate-in fade-in container mx-auto py-8 transition-colors duration-500">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 transition-colors dark:text-slate-100">
                    Danh sách Khảo sát
                </h2>
                <Button
                    onClick={handleAddSurvey}
                    className="bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                    Thêm mới khảo sát
                </Button>
            </div>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 font-medium text-slate-500 transition-colors dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">STT</th>
                                <th className="px-4 py-3 whitespace-nowrap">Ngày khảo sát</th>
                                <th className="min-w-[200px] px-4 py-3">Nội dung khảo sát</th>
                                <th className="px-4 py-3 whitespace-nowrap">Nhân viên</th>
                                <th className="px-4 py-3 whitespace-nowrap">Đánh giá</th>
                                <th className="px-4 py-3 whitespace-nowrap">Kết quả</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap">Hành động</th>
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
                                    <tr key={survey.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{index + 1}</td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                            {formatDate(survey.survey_date)}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                            {survey.content || '---'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                            {survey.staff || '---'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                            {survey.evaluation || '---'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                            {survey.results || '---'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`${pathname}/${survey.id}`)}
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