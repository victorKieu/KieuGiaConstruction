// Dịch vụ components phải được tạo thành Client Component
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation'; // Hoặc bạn có thể dùng useRouter khi cần trong Client Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const SurveyList = () => {
    const pathname = usePathname(); // Đường dẫn hiện tại
    const projectId = pathname.split('/')[3]; // Giả sử id dự án nằm ở vị trí thứ 3 trong đường dẫn
    const [surveys, setSurveys] = useState<any[]>([]);

    useEffect(() => {
        const fetchSurveys = async () => {
            if (projectId) {
                const response = await fetch(`/api/projects/${projectId}/surveys`);
                const data = await response.json();
                setSurveys(data);
            }
        };
        fetchSurveys();
    }, [projectId]);

    const handleAddSurvey = () => {
        // Chuyển hướng đến trang thêm khảo sát
        window.location.href = `.survey/new`;
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Danh sách Khảo sát</h2>
                <Button onClick={handleAddSurvey}>Thêm mới khảo sát</Button>
            </div>
            <Card>
                <table className="w-full table-auto">
                    <thead>
                        <tr>
                            <th>Số thứ tự</th>
                            <th>Ngày khảo sát</th>
                            <th>Nội dung khảo sát</th>
                            <th>Nhân viên khảo sát</th>
                            <th>Đánh giá</th>
                            <th>Kết quả</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {surveys.map((survey, index) => (
                            <tr key={survey.id}>
                                <td>{index + 1}</td>
                                <td>{new Date(survey.survey_date).toLocaleDateString()}</td>
                                <td>{survey.content}</td>
                                <td>{survey.staff}</td>
                                <td>{survey.evaluation}</td>
                                <td>{survey.results}</td>
                                <td>
                                    <Button onClick={() => window.location.href = `/app/projects/${projectId}/surveys/${survey.id}`}>Xem</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default SurveyList;
