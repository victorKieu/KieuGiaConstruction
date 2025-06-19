'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';

const SurveyDetail: React.FC = () => {
    const router = useRouter();
    const { id, projectId } = router.query; // projectId và surveyId
    const [survey, setSurvey] = useState<any>(null);

    useEffect(() => {
        const fetchSurvey = async () => {
            if (id && projectId) {
                const response = await fetch(`/api/projects/${projectId}/surveys/${id}`);
                const data = await response.json();
                setSurvey(data);
            }
        };
        fetchSurvey();
    }, [id, projectId]);

    const handleDelete = async () => {
        const response = await fetch(`/api/projects/${projectId}/surveys/${id}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            router.push(`/app/projects/${projectId}/surveys`); // Chuyển hướng về danh sách khảo sát
        }
    };

    if (!survey) return <p>Đang tải...</p>;

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-xl font-bold">Chi tiết khảo sát</h1>
            <p>Nội dung: {survey.content}</p>
            <p>Nhân viên: {survey.staff}</p>
            <p>Đánh giá: {survey.evaluation}</p>
            <p>Kết quả: {survey.results}</p>

            <div className="mt-4">
                <Button onClick={() => router.push(`/app/projects/${projectId}/surveys/edit/${id}`)}>Sửa</Button>
                <Button onClick={handleDelete}>Xóa</Button>
            </div>
        </div>
    );
};

export default SurveyDetail;
