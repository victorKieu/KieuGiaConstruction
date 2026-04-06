"use client"

import React, { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronRight, ChevronLeft, CheckCircle2, Scale, Truck, Mountain, Home, Compass, Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { submitFullSurveyWizard } from "@/lib/action/surveyActions"

export default function SurveyWizard({ projectId }: { projectId: string }) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    // 🔴 KHỐI DỮ LIỆU KHỔNG LỒ (ĐÁP ỨNG LUẬT ĐỊNH & PHONG THỦY)
    const [surveyData, setSurveyData] = useState({
        // Bước 1: Pháp lý
        legal_status: "da_co_so", setback_front: "0", setback_back: "0", max_floors: "4", build_density: "100",
        // Bước 2: Hạ tầng & Logistics
        road_access: "xe_tai", workspace: "rong", elevation_diff: "20", has_electricity: "co", has_water: "co",
        // Bước 3: Địa chất & Hiện trạng
        current_state: "dat_trong", soil_type: "dat_tot", ground_water: "khong",
        // Bước 4: Khảo sát liền kề (An toàn)
        neighbor_left: "nha_cap_4", neighbor_right: "nha_cao_tang", neighbor_back: "dat_trong", has_cracks: "khong", boundary_clear: "ro_rang",
        // Bước 5: Phong thủy Bát Trạch
        owner_birth_year: "", owner_gender: "nam", main_direction: "dong", altar_direction: "", kitchen_direction: "",
        // Bước 6: Ghi chú
        general_notes: ""
    })

    const handleChange = (field: string, value: string) => {
        setSurveyData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            // Không dùng createClient() trực tiếp nữa, gọi thẳng xuống Server Action
            const res = await submitFullSurveyWizard(projectId, surveyData);

            if (!res.success) {
                throw new Error(res.error);
            }

            toast.success("Đã lưu Phiếu khảo sát 6 bước thành công!")
            setStep(1)
            router.refresh()
        } catch (err: any) {
            toast.error("Lỗi khi lưu dữ liệu: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    const stepIcons = [Scale, Truck, Mountain, Home, Compass, Camera]

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-red-800 text-sm mb-4">
                            <strong>Lưu ý Luật Xây Dựng:</strong> Việc xác định sai chỉ giới lùi hoặc mật độ xây dựng có thể dẫn đến đình chỉ thi công hoặc buộc tháo dỡ.
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold">Tình trạng Sổ đỏ / Pháp lý</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.legal_status} onChange={e => handleChange("legal_status", e.target.value)}>
                                    <option value="da_co_so">Đã có sổ đỏ (Rõ ranh)</option><option value="so_chung">Sổ chung / Đợi tách thửa</option><option value="tranh_chap">Đang tranh chấp ranh</option>
                                </select>
                            </div>
                            <div><label className="text-xs font-bold">Số tầng tối đa cho phép</label><Input type="number" value={surveyData.max_floors} onChange={e => handleChange("max_floors", e.target.value)} className="mt-1" /></div>
                            <div><label className="text-xs font-bold">Lùi trước (m)</label><Input type="number" value={surveyData.setback_front} onChange={e => handleChange("setback_front", e.target.value)} className="mt-1" /></div>
                            <div><label className="text-xs font-bold">Lùi sau (m)</label><Input type="number" value={surveyData.setback_back} onChange={e => handleChange("setback_back", e.target.value)} className="mt-1" /></div>
                            <div><label className="text-xs font-bold">Mật độ XD cho phép (%)</label><Input type="number" value={surveyData.build_density} onChange={e => handleChange("build_density", e.target.value)} className="mt-1" /></div>
                        </div>
                    </div>
                )
            case 2:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2"><label className="text-xs font-bold">Đường vào công trình</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.road_access} onChange={e => handleChange("road_access", e.target.value)}>
                                    <option value="xe_tai">Đường lớn (Xe tải, xe bồn bê tông vào tận nơi)</option>
                                    <option value="ba_gac">Hẻm nhỏ (Ba gác, phải bơm bê tông xa / trộn tay)</option>
                                </select>
                            </div>
                            <div><label className="text-xs font-bold">Mặt bằng tập kết vật tư</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.workspace} onChange={e => handleChange("workspace", e.target.value)}>
                                    <option value="rong">Rộng rãi (Để được trong nhà)</option><option value="hep">Chật hẹp (Phải thuê vỉa hè/mua lắt nhắt)</option>
                                </select>
                            </div>
                            <div><label className="text-xs font-bold">Cốt nền nhà so với đường (cm)</label><Input type="number" value={surveyData.elevation_diff} onChange={e => handleChange("elevation_diff", e.target.value)} className="mt-1" placeholder="VD: Nhà cao hơn đường 20cm" /></div>
                            <div><label className="text-xs font-bold">Điện thi công</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.has_electricity} onChange={e => handleChange("has_electricity", e.target.value)}><option value="co">Đã có đồng hồ</option><option value="xin_nho">Phải câu nhờ / Xin cấp mới</option></select>
                            </div>
                            <div><label className="text-xs font-bold">Nước thi công</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.has_water} onChange={e => handleChange("has_water", e.target.value)}><option value="co">Đã có đồng hồ</option><option value="xin_nho">Phải câu nhờ giếng khoan</option></select>
                            </div>
                        </div>
                    </div>
                )
            case 3:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2"><label className="text-xs font-bold">Tình trạng mặt bằng</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.current_state} onChange={e => handleChange("current_state", e.target.value)}>
                                    <option value="dat_trong">Đất trống (Sẵn sàng ép cọc/đào móng)</option>
                                    <option value="nha_cap_4">Nhà cấp 4 (Cần phá dỡ, thu dọn xà bần)</option>
                                    <option value="nha_kien_co">Nhà kiên cố (Chi phí đập phá cao)</option>
                                </select>
                            </div>
                            <div><label className="text-xs font-bold">Cảm quan Địa chất</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.soil_type} onChange={e => handleChange("soil_type", e.target.value)}>
                                    <option value="dat_tot">Đất thịt, cứng (Dùng móng nông)</option>
                                    <option value="dat_yeu">Đất bùn, sình lầy (Bắt buộc ép cọc)</option>
                                </select>
                            </div>
                            <div><label className="text-xs font-bold">Mực nước ngầm</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.ground_water} onChange={e => handleChange("ground_water", e.target.value)}>
                                    <option value="khong">Khô ráo</option>
                                    <option value="co">Nước ngầm cao (Cần máy bơm liên tục)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )
            case 4:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-orange-800 text-sm mb-4">
                            <strong>Cảnh báo sụp lún:</strong> Việc khảo sát móng nhà liền kề giúp né rủi ro đền bù hàng tỷ đồng khi đào móng làm nứt nhà hàng xóm.
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="text-xs font-bold">Hàng xóm TRÁI</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.neighbor_left} onChange={e => handleChange("neighbor_left", e.target.value)}><option value="dat_trong">Đất trống</option><option value="nha_cap_4">Nhà cấp 4 (Móng nông)</option><option value="nha_cao_tang">Nhà cao tầng (Móng sâu)</option></select>
                            </div>
                            <div><label className="text-xs font-bold">Hàng xóm PHẢI</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.neighbor_right} onChange={e => handleChange("neighbor_right", e.target.value)}><option value="dat_trong">Đất trống</option><option value="nha_cap_4">Nhà cấp 4 (Móng nông)</option><option value="nha_cao_tang">Nhà cao tầng (Móng sâu)</option></select>
                            </div>
                            <div><label className="text-xs font-bold">Hàng xóm SAU</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.neighbor_back} onChange={e => handleChange("neighbor_back", e.target.value)}><option value="dat_trong">Đất trống</option><option value="nha_cap_4">Nhà cấp 4 (Móng nông)</option><option value="nha_cao_tang">Nhà cao tầng (Móng sâu)</option></select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div><label className="text-xs font-bold text-red-600">Hiện trạng nứt nẻ liền kề?</label>
                                <select className="w-full p-2 border border-red-200 rounded-md mt-1" value={surveyData.has_cracks} onChange={e => handleChange("has_cracks", e.target.value)}>
                                    <option value="khong">Đang nguyên vẹn</option>
                                    <option value="co">Đã có nứt sẵn (Cần chụp ảnh lập vi bằng)</option>
                                </select>
                            </div>
                            <div><label className="text-xs font-bold">Ranh giới đất</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.boundary_clear} onChange={e => handleChange("boundary_clear", e.target.value)}><option value="ro_rang">Tường riêng, mốc rõ ràng</option><option value="tuong_chung">Xây tường chung</option></select>
                            </div>
                        </div>
                    </div>
                )
            case 5:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200 text-indigo-800 text-sm mb-4">
                            <strong>Phong thủy Lạc Việt:</strong> Thông tin này giúp Kiến trúc sư bố trí cửa, bếp, bàn thờ, WC không bị dính các hướng tuyệt mệnh, ngũ quỷ.
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold">Năm sinh gia chủ (Âm lịch)</label><Input type="number" placeholder="VD: 1985" value={surveyData.owner_birth_year} onChange={e => handleChange("owner_birth_year", e.target.value)} className="mt-1" /></div>
                            <div><label className="text-xs font-bold">Giới tính gia chủ</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.owner_gender} onChange={e => handleChange("owner_gender", e.target.value)}><option value="nam">Nam</option><option value="nu">Nữ</option></select>
                            </div>
                            <div className="col-span-2"><label className="text-xs font-bold">Hướng khu đất (Tọa hướng)</label>
                                <select className="w-full p-2 border rounded-md mt-1" value={surveyData.main_direction} onChange={e => handleChange("main_direction", e.target.value)}>
                                    <option value="dong">Đông</option><option value="tay">Tây</option><option value="nam">Nam</option><option value="bac">Bắc</option>
                                    <option value="dong_nam">Đông Nam</option><option value="dong_bac">Đông Bắc</option><option value="tay_nam">Tây Nam</option><option value="tay_bac">Tây Bắc</option>
                                </select>
                            </div>
                            <div><label className="text-xs font-bold text-slate-500">Yêu cầu hướng Bàn Thờ (Tùy chọn)</label><Input value={surveyData.altar_direction} onChange={e => handleChange("altar_direction", e.target.value)} className="mt-1" /></div>
                            <div><label className="text-xs font-bold text-slate-500">Yêu cầu hướng Bếp (Tùy chọn)</label><Input value={surveyData.kitchen_direction} onChange={e => handleChange("kitchen_direction", e.target.value)} className="mt-1" /></div>
                        </div>
                    </div>
                )
            case 6:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 transition-colors">
                            <Camera className="w-8 h-8 mb-2 text-blue-500" />
                            <p className="font-bold">Chụp/Tải lên hình ảnh hiện trạng</p>
                            <p className="text-xs mt-1">(Upload ảnh đường hẻm, đồng hồ điện, vách nhà hàng xóm...)</p>
                            <Button variant="outline" size="sm" className="mt-4">Chọn ảnh</Button>
                        </div>
                        <div>
                            <label className="text-xs font-bold">Ghi chú đặc biệt của Kỹ sư khảo sát</label>
                            <Textarea rows={4} value={surveyData.general_notes} onChange={e => handleChange("general_notes", e.target.value)} className="mt-1" placeholder="Nhập các lưu ý khác như: Chủ nhà khó tính, cấm thi công giờ trưa..." />
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <Card className="max-w-3xl mx-auto shadow-md border-slate-200">
            <CardHeader className="bg-slate-50 border-b p-4 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl text-blue-800 flex items-center gap-2">
                        <Compass className="w-6 h-6 text-orange-500" />
                        Phiếu Khảo Sát Hiện Trạng Đa Chiều
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">Pháp lý - Hạ tầng - Địa chất - An toàn - Phong thủy</p>
                </div>
                <div className="text-sm font-bold text-slate-400 bg-white px-3 py-1 rounded-full border">
                    Bước {step} / 6
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* THANH TIẾN ĐỘ */}
                <div className="flex px-8 py-6 justify-between relative bg-white">
                    <div className="absolute top-10 left-12 right-12 h-1 bg-slate-100 -z-10"></div>
                    <div className="absolute top-10 left-12 h-1 bg-blue-500 transition-all duration-500 -z-10" style={{ width: `${((step - 1) / 5) * 100}%` }}></div>

                    {[1, 2, 3, 4, 5, 6].map((i) => {
                        const Icon = stepIcons[i - 1];
                        const isActive = i === step;
                        const isDone = i < step;
                        return (
                            <div key={i} className="flex flex-col items-center gap-2 z-10">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'border-blue-600 bg-white text-blue-700 shadow-md scale-110' : isDone ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-white text-slate-300'}`}>
                                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="px-8 pb-8 min-h-[380px] bg-white">
                    <h2 className="text-lg font-bold text-slate-700 border-b pb-2 mb-5">
                        {step === 1 && "BƯỚC 1: KHẢO SÁT PHÁP LÝ & QUY HOẠCH"}
                        {step === 2 && "BƯỚC 2: HẠ TẦNG & LOGISTICS THI CÔNG"}
                        {step === 3 && "BƯỚC 3: HIỆN TRẠNG MẶT BẰNG & ĐỊA CHẤT"}
                        {step === 4 && "BƯỚC 4: RỦI RO LIỀN KỀ (HÀNG XÓM)"}
                        {step === 5 && "BƯỚC 5: THÔNG TIN PHONG THỦY CƠ BẢN"}
                        {step === 6 && "BƯỚC 6: HÌNH ẢNH & GHI CHÚ CHUNG"}
                    </h2>
                    {renderStep()}
                </div>

                {/* FOOTER ĐIỀU HƯỚNG */}
                <div className="bg-slate-50 border-t p-4 flex justify-between items-center rounded-b-xl">
                    <Button variant="ghost" onClick={() => setStep(1)} disabled={step === 1}>Làm lại</Button>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
                            <ChevronLeft className="w-4 h-4 mr-1" /> Quay lại
                        </Button>

                        {step < 6 ? (
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6" onClick={() => setStep(s => s + 1)}>
                                Tiếp theo <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-6 shadow-md">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                Hoàn tất Khảo sát
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}