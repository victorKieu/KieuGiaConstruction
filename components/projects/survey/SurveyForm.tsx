"use client"

import { useState } from "react"
import supabase from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SurveyForm({ projectId }: { projectId: string }) {
    const [loading, setLoading] = useState(false)
    const [surveyData, setSurveyData] = useState({
        geometry: { width: 5, depth: 20, floors: 1, floorHeight: 3.6 },
        soil: "soft", // soft: đất yếu, hard: đất cứng
        roadAccess: "truck", // xe tải hoặc xe ba gác
        electricity: "available",
        neighborFoundation: "pile", // móng cọc hoặc móng băng
    })

    const handleSubmit = async () => {
        setLoading(true)
        try {
            // Lưu dữ liệu vào bảng project_surveys
            const { error } = await supabase
                .from("project_surveys")
                .insert({
                    project_id: projectId,
                    survey_date: new Date().toISOString(),
                    survey_details: surveyData, // Lưu vào trường JSONB đã tạo
                })

            if (error) throw error
            alert("Đã lưu dữ liệu khảo sát! Sẵn sàng để AI bóc tách khối lượng.")
        } catch (err) {
            console.error(err)
            alert("Có lỗi xảy ra khi lưu dữ liệu.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="max-w-2xl mx-auto mt-8">
            <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-xl text-blue-700">Phiếu Khảo Sát Hiện Trạng ✨</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                {/* Thông số hình học */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-bold">Chiều ngang lô đất (m)</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded mt-1"
                            value={surveyData.geometry.width}
                            onChange={(e) => setSurveyData({ ...surveyData, geometry: { ...surveyData.geometry, width: Number(e.target.value) } })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold">Chiều sâu lô đất (m)</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded mt-1"
                            value={surveyData.geometry.depth}
                            onChange={(e) => setSurveyData({ ...surveyData, geometry: { ...surveyData.geometry, depth: Number(e.target.value) } })}
                        />
                    </div>
                </div>

                {/* Đặc điểm kỹ thuật */}
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-bold">Địa chất khu vực</label>
                        <select
                            className="w-full p-2 border rounded mt-1"
                            value={surveyData.soil}
                            onChange={(e) => setSurveyData({ ...surveyData, soil: e.target.value })}
                        >
                            <option value="soft">Đất yếu (Dễ lún, cần ép cọc)</option>
                            <option value="hard">Đất cứng (Có thể dùng móng băng)</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-bold">Lối vào công trình</label>
                        <select
                            className="w-full p-2 border rounded mt-1"
                            value={surveyData.roadAccess}
                            onChange={(e) => setSurveyData({ ...surveyData, roadAccess: e.target.value })}
                        >
                            <option value="truck">Xe tải vào được (Vật tư rẻ hơn)</option>
                            <option value="small_cart">Hẻm nhỏ - Xe ba gác (Tốn công vận chuyển)</option>
                        </select>
                    </div>
                </div>

                <Button
                    onClick={handleSubmit}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    disabled={loading}
                >
                    {loading ? "Đang lưu..." : "Lưu dữ liệu & Tiếp tục sang Bản vẽ"}
                </Button>
            </CardContent>
        </Card>
    )
}