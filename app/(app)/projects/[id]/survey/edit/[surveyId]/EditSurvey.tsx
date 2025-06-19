'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const EditSurvey: React.FC = () => {
    const router = useRouter();
    const { id, projectId } = router.query;
    const [survey, setSurvey] = useState<any>(null);

    useEffect(() => {
        const fetchSurvey = async () => {
            if (id && projectId) {
                const response = await fetch(`/api/projects/${projectId}/surveys/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setSurvey(data);
                }
            }
        };
        fetchSurvey();
    }, [id, projectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const response = await fetch(`/api/projects/${projectId}/surveys/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(survey),
        });

        if (response.ok) {
            router.push(`/app/projects/${projectId}/survey/${id}`); // Chuyển hướng về trang chi tiết khảo sát
        }
    };

    if (!survey) return <p>Đang tải...</p>;

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-xl font-bold">Sửa Khảo sát</h1>
            <form onSubmit={handleSubmit} className="mt-4">
                <div className="mb-4">
                    <label htmlFor="content">Nội dung khảo sát</label>
                    <Textarea
                        id="content"
                        value={survey.content}
                        onChange={(e) => setSurvey({ ...survey, content: e.target.value })}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="staff">Nhân viên khảo sát</label>
                    <Input
                        id="staff"
                        value={survey.staff}
                        onChange={(e) => setSurvey({ ...survey, staff: e.target.value })}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="evaluation">Đánh giá</label>
                    <Input
                        id="evaluation"
                        value={survey.evaluation}
                        onChange={(e) => setSurvey({ ...survey, evaluation: e.target.value })}
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="results">Kết quả</label>
                    <Textarea
                        id="results"
                        value={survey.results}
                        onChange={(e) => setSurvey({ ...survey, results: e.target.value })}
                    />
                </div>
                <Button type="submit">Cập nhật Khảo sát</Button>
            </form>
        </div>
    );
};

export default EditSurvey;
