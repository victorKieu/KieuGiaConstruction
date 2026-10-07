'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

const CreateSurvey = () => {
    const router = useRouter();
    const params = useParams();

    // ✅ Lấy projectId an toàn tuyệt đối từ App Router, không dùng window.location
    const projectId = params?.id || params?.projectId;

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Các trường thông tin ban đầu
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

        if (!projectId) {
            toast.error("Lỗi: Không xác định được Dự án!");
            return;
        }

        setIsSubmitting(true);

        const newSurvey = {
            content, staff, evaluation, results,
            coordinates, houseOrientation, terrainType, buildingRegulations,
            landLength, landWidth, projectLength, projectWidth, analysisReport,
        };

        try {
            const response = await fetch(`/api/projects/${projectId}/surveys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSurvey),
            });

            if (response.ok) {
                toast.success("Tạo khảo sát thành công!");
                // ✅ Sửa đường dẫn redirect khớp với file SurveyList (surveys có 's')
                router.push(`/app/projects/${projectId}/surveys`);
            } else {
                const err = await response.json();
                toast.error(err.message || "Có lỗi xảy ra khi lưu!");
            }
        } catch (error) {
            toast.error("Lỗi kết nối đến máy chủ!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Class dùng chung cho UI đồng bộ
    const labelStyle = "block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300 transition-colors";
    const inputStyle = "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus-visible:ring-blue-500 transition-colors";

    return (
        <div className="animate-in fade-in container mx-auto max-w-5xl py-8 duration-500">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 transition-colors dark:text-slate-100">Thêm mới Khảo sát</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Nhập thông tin chi tiết hiện trường và quy hoạch</p>
                </div>
                <Button variant="outline" onClick={() => router.back()} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                </Button>
            </div>

            <Card className="border-slate-200 bg-white p-6 shadow-sm transition-colors md:p-8 dark:border-slate-800 dark:bg-slate-900">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* NHÓM 1: THÔNG TIN CHUNG */}
                    <div>
                        <h3 className="mb-4 border-b border-slate-100 pb-2 text-lg font-bold text-blue-700 dark:border-slate-800 dark:text-blue-400">1. Thông tin chung</h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className={labelStyle}>Nội dung khảo sát</label>
                                <Input required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nhập mục đích/nội dung đợt khảo sát" className={inputStyle} />
                            </div>
                            <div>
                                <label className={labelStyle}>Nhân viên phụ trách</label>
                                <Input required value={staff} onChange={(e) => setStaff(e.target.value)} placeholder="Tên người khảo sát" className={inputStyle} />
                            </div>
                            <div>
                                <label className={labelStyle}>Đánh giá sơ bộ</label>
                                <Input value={evaluation} onChange={(e) => setEvaluation(e.target.value)} placeholder="Đánh giá nhanh..." className={inputStyle} />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelStyle}>Kết quả tóm tắt</label>
                                <Textarea value={results} onChange={(e) => setResults(e.target.value)} placeholder="Ghi chú kết quả..." className={inputStyle} />
                            </div>
                        </div>
                    </div>

                    {/* NHÓM 2: ĐỊA LÝ & PHONG THỦY */}
                    <div>
                        <h3 className="mb-4 border-b border-slate-100 pb-2 text-lg font-bold text-blue-700 dark:border-slate-800 dark:text-blue-400">2. Địa lý & Hiện trạng</h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <label htmlFor="coordinates" className={labelStyle}>Tọa độ (GPS)</label>
                                <Input id="coordinates" value={coordinates} onChange={(e) => setCoordinates(e.target.value)} required placeholder="VD: 10.762622, 106.660172" className={inputStyle} />
                            </div>
                            <div>
                                <label htmlFor="houseOrientation" className={labelStyle}>Hướng nhà</label>
                                <Input id="houseOrientation" value={houseOrientation} onChange={(e) => setHouseOrientation(e.target.value)} required placeholder="VD: Đông Nam" className={inputStyle} />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="terrainType" className={labelStyle}>Cấu tạo Địa chất / Hiện trạng</label>
                                <Input id="terrainType" value={terrainType} onChange={(e) => setTerrainType(e.target.value)} required placeholder="VD: Đất cát pha, nền đất yếu, có công trình cũ..." className={inputStyle} />
                            </div>
                        </div>
                    </div>

                    {/* NHÓM 3: KÍCH THƯỚC & QUY HOẠCH */}
                    <div>
                        <h3 className="mb-4 border-b border-slate-100 pb-2 text-lg font-bold text-blue-700 dark:border-slate-800 dark:text-blue-400">3. Kích thước & Quy chế</h3>
                        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
                            <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4 md:col-span-2 dark:border-slate-800 dark:bg-slate-950">
                                <div className="col-span-2"><span className="text-xs font-bold text-slate-400 uppercase">Kích thước Đất</span></div>
                                <div>
                                    <label htmlFor="landLength" className={labelStyle}>Chiều Dài (m)</label>
                                    <Input id="landLength" type="number" step="any" value={landLength} onChange={(e) => setLandLength(e.target.value)} required className={inputStyle} />
                                </div>
                                <div>
                                    <label htmlFor="landWidth" className={labelStyle}>Chiều Rộng (m)</label>
                                    <Input id="landWidth" type="number" step="any" value={landWidth} onChange={(e) => setLandWidth(e.target.value)} required className={inputStyle} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4 md:col-span-2 dark:border-slate-800 dark:bg-slate-950">
                                <div className="col-span-2"><span className="text-xs font-bold text-slate-400 uppercase">Kích thước Xây dựng</span></div>
                                <div>
                                    <label htmlFor="projectLength" className={labelStyle}>Chiều Dài (m)</label>
                                    <Input id="projectLength" type="number" step="any" value={projectLength} onChange={(e) => setProjectLength(e.target.value)} required className={inputStyle} />
                                </div>
                                <div>
                                    <label htmlFor="projectWidth" className={labelStyle}>Chiều Rộng (m)</label>
                                    <Input id="projectWidth" type="number" step="any" value={projectWidth} onChange={(e) => setProjectWidth(e.target.value)} required className={inputStyle} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <label htmlFor="buildingRegulations" className={labelStyle}>Quy chế xây dựng (Lùi trước/sau, Mật độ...)</label>
                                <Textarea id="buildingRegulations" value={buildingRegulations} onChange={(e) => setBuildingRegulations(e.target.value)} required className={`h-24 ${inputStyle}`} />
                            </div>
                            <div>
                                <label htmlFor="analysisReport" className={labelStyle}>Phân tích & Báo cáo rủi ro</label>
                                <Textarea id="analysisReport" value={analysisReport} onChange={(e) => setAnalysisReport(e.target.value)} className={`h-24 ${inputStyle}`} />
                            </div>
                        </div>
                    </div>

                    {/* NÚT SUBMIT */}
                    <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                        <Button type="button" variant="ghost" onClick={() => router.back()} className="mr-4 dark:text-slate-300 dark:hover:bg-slate-800">
                            Hủy
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 px-8 text-white shadow-md hover:bg-blue-700">
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" /> Lưu Khảo sát</>
                            )}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateSurvey;