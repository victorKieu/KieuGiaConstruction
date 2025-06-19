'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const CreateSurvey: React.FC = () => {
    const router = useRouter();
    const projectId = router.query.id;
    const [content, setContent] = useState('');
    const [staff, setStaff] = useState('');
    const [evaluation, setEvaluation] = useState('');
    const [results, setResults] = useState('');

    // Các trường thông tin bổ sung
    const [coordinates, setCoordinates] = useState('');
    const [houseOrientation, setHouseOrientation] = useState('');
    const [terrainType, setTerrainType] = useState('');
    const [buildingRegulations, setBuildingRegulations] = useState('');
    const [landLength, setLandLength] = useState('');
    const [landWidth, setLandWidth] = useState('');
    const [projectLength, setProjectLength] = useState('');
    const [projectWidth, setProjectWidth] = useState('');
    const [analysisReport, setAnalysisReport] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newSurvey = {
            content,
            staff,
            evaluation,
            results,
            coordinates,
            houseOrientation,
            terrainType,
            buildingRegulations,
            landLength,
            landWidth,
            projectLength,
            projectWidth,
            analysisReport,
        };

        const response = await fetch(`/api/projects/${projectId}/surveys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newSurvey),
        });

        if (response.ok) {
            router.push(`/app/projects/${projectId}/survey`);
        }
    };

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-xl font-bold">Thêm mới Khảo sát</h1>
            <form onSubmit={handleSubmit} className="mt-4">
                {/* Các trường thông tin ban đầu */}
                {/* ... (các trường đã có) ... */}

                {/* Các trường thông tin địa lý */}
                <div className="mb-4">
                    <label htmlFor="coordinates">Tọa độ</label>
                    <Input
                        id="coordinates"
                        value={coordinates}
                        onChange={(e) => setCoordinates(e.target.value)}
                        required
                        placeholder="Nhập tọa độ (VD: 12.345678, 98.765432)"
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="houseOrientation">Hướng nhà</label>
                    <Input
                        id="houseOrientation"
                        value={houseOrientation}
                        onChange={(e) => setHouseOrientation(e.target.value)}
                        required
                        placeholder="Nhập hướng nhà (VD: Bắc, Nam, Đông, Tây)"
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="terrainType">Địa chất</label>
                    <Input
                        id="terrainType"
                        value={terrainType}
                        onChange={(e) => setTerrainType(e.target.value)}
                        required
                        placeholder="Nhập loại địa chất"
                    />
                </div>

                {/* Thông tin quy chế xây dựng */}
                <div className="mb-4">
                    <label htmlFor="buildingRegulations">Quy chế xây dựng</label>
                    <Textarea
                        id="buildingRegulations"
                        value={buildingRegulations}
                        onChange={(e) => setBuildingRegulations(e.target.value)}
                        required
                    />
                </div>

                {/* Kích thước đất */}
                <div className="mb-4">
                    <label htmlFor="landLength">Kích thước đất (Dài)</label>
                    <Input
                        id="landLength"
                        value={landLength}
                        onChange={(e) => setLandLength(e.target.value)}
                        required
                        placeholder="Nhập chiều dài đất"
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="landWidth">Kích thước đất (Rộng)</label>
                    <Input
                        id="landWidth"
                        value={landWidth}
                        onChange={(e) => setLandWidth(e.target.value)}
                        required
                        placeholder="Nhập chiều rộng đất"
                    />
                </div>

                {/* Kích thước công trình */}
                <div className="mb-4">
                    <label htmlFor="projectLength">Kích thước công trình (Dài)</label>
                    <Input
                        id="projectLength"
                        value={projectLength}
                        onChange={(e) => setProjectLength(e.target.value)}
                        required
                        placeholder="Nhập chiều dài công trình"
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="projectWidth">Kích thước công trình (Rộng)</label>
                    <Input
                        id="projectWidth"
                        value={projectWidth}
                        onChange={(e) => setProjectWidth(e.target.value)}
                        required
                        placeholder="Nhập chiều rộng công trình"
                    />
                </div>

                {/* Phân tích và báo cáo kết quả */}
                <div className="mb-4">
                    <label htmlFor="analysisReport">Phân tích và báo cáo kết quả</label>
                    <Textarea
                        id="analysisReport"
                        value={analysisReport}
                        onChange={(e) => setAnalysisReport(e.target.value)}
                    />
                </div>

                {/* Nút lưu khảo sát */}
                <Button type="submit">Lưu Khảo sát</Button>
            </form>
        </div>
    );
};

export default CreateSurvey;
