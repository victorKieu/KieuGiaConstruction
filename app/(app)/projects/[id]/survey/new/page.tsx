'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation'; // ✅ Chuyển sang next/navigation chuẩn App Router
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

const CreateSurvey: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    // Lấy projectId từ params, fallback dùng split URL nếu params chưa kịp mount
    const projectId = params?.id || (typeof window !== 'undefined' ? window.location.pathname.split('/')[3] : '');

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
                router.push(`/app/projects/${projectId}/survey`);
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
        <div className="container mx-auto py-8 max-w-5xl animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Thêm mới Khảo sát</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Nhập thông tin chi tiết hiện trường và quy hoạch</p>
                </div>
                <Button variant="outline" onClick={() => router.back()} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
                </Button>
            </div>

            <Card className="p-6 md:p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* NHÓM 1: THÔNG TIN CHUNG */}
                    <div>
                        <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">1. Thông tin chung</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">2. Địa lý & Hiện trạng</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">3. Kích thước & Quy chế</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="col-span-2"><span className="text-xs font-bold uppercase text-slate-400">Kích thước Đất</span></div>
                                <div>
                                    <label htmlFor="landLength" className={labelStyle}>Chiều Dài (m)</label>
                                    <Input id="landLength" type="number" value={landLength} onChange={(e) => setLandLength(e.target.value)} required className={inputStyle} />
                                </div>
                                <div>
                                    <label htmlFor="landWidth" className={labelStyle}>Chiều Rộng (m)</label>
                                    <Input id="landWidth" type="number" value={landWidth} onChange={(e) => setLandWidth(e.target.value)} required className={inputStyle} />
                                </div>
                            </div>
                            <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="col-span-2"><span className="text-xs font-bold uppercase text-slate-400">Kích thước Xây dựng</span></div>
                                <div>
                                    <label htmlFor="projectLength" className={labelStyle}>Chiều Dài (m)</label>
                                    <Input id="projectLength" type="number" value={projectLength} onChange={(e) => setProjectLength(e.target.value)} required className={inputStyle} />
                                </div>
                                <div>
                                    <label htmlFor="projectWidth" className={labelStyle}>Chiều Rộng (m)</label>
                                    <Input id="projectWidth" type="number" value={projectWidth} onChange={(e) => setProjectWidth(e.target.value)} required className={inputStyle} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="ghost" onClick={() => router.back()} className="mr-4 dark:text-slate-300 dark:hover:bg-slate-800">
                            Hủy
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-8 shadow-md">
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> Lưu Khảo sát</>
                            )}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateSurvey;