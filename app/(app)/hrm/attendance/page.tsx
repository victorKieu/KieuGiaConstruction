"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Clock, CalendarDays, AlertCircle, Send, MapPinned, History, FileEdit, Plus } from "lucide-react";
import { toast } from "sonner";
import { AttendanceTable, AttendanceRecord } from "@/components/hrm/AttendanceTable";

// Dữ liệu mẫu
const mockAttendance: AttendanceRecord[] = [
    { id: "1", date: "2026-03-31", employeeCode: "NV001", name: "Nguyễn Văn A", checkIn: "08:05", checkOut: "17:00", status: "Đủ công" },
];

export default function AttendancePage() {
    const [currentTime, setCurrentTime] = useState<string>("");
    const [isLocating, setIsLocating] = useState(false);
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);

    // Cập nhật đồng hồ realtime
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // HÀM CHẤM CÔNG BẰNG GPS (Cho Mobile)
    const handleCheckInGPS = () => {
        if (!navigator.geolocation) {
            toast.error("Trình duyệt/Thiết bị của bạn không hỗ trợ GPS!");
            return;
        }

        setIsLocating(true);
        toast.info("Đang lấy tọa độ GPS...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ lat: latitude, lng: longitude });
                setIsLocating(false);
                toast.success(`Chấm công thành công lúc ${currentTime}! Tọa độ: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                // TODO: Bắn API lưu vào Database kèm Tọa độ
            },
            (error) => {
                setIsLocating(false);
                if (error.code === error.PERMISSION_DENIED) {
                    toast.error("Bạn chưa cấp quyền truy cập vị trí cho trang web này!");
                } else {
                    toast.error("Không thể lấy vị trí hiện tại. Vui lòng thử lại.");
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Quản lý Chấm công & Đơn từ</h1>
                    <p className="text-sm text-slate-500">Hệ thống ghi nhận thời gian làm việc và xử lý phép</p>
                </div>
            </div>

            <Tabs defaultValue="checkin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                    <TabsTrigger value="checkin">Chấm công</TabsTrigger>
                    <TabsTrigger value="requests">Đơn từ & Phép</TabsTrigger>
                </TabsList>

                {/* TAB 1: CHẤM CÔNG */}
                <TabsContent value="checkin" className="space-y-4 mt-4">

                    {/* GIAO DIỆN MOBILE: Nút chấm công to bự */}
                    <div className="block md:hidden">
                        <Card className="border-indigo-200 shadow-md bg-gradient-to-b from-indigo-50 to-white">
                            <CardContent className="pt-8 pb-10 flex flex-col items-center justify-center space-y-6">
                                <div className="text-center space-y-1">
                                    <div className="text-4xl font-mono font-bold text-indigo-700 tracking-wider">{currentTime || "--:--:--"}</div>
                                    <div className="text-sm text-slate-500">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                </div>

                                {/* Vòng tròn chấm công */}
                                <button
                                    onClick={handleCheckInGPS}
                                    disabled={isLocating}
                                    className="relative w-40 h-40 rounded-full bg-indigo-600 flex flex-col items-center justify-center text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
                                >
                                    {isLocating ? (
                                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent" />
                                    ) : (
                                        <>
                                            <MapPinned className="w-10 h-10 mb-2" />
                                            <span className="font-bold text-lg">CHẤM CÔNG</span>
                                            <span className="text-xs opacity-80 mt-1">Ghi nhận GPS</span>
                                        </>
                                    )}
                                </button>

                                {location && (
                                    <div className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                                        <MapPin className="w-3 h-3 mr-1" /> Đã chốt vị trí: {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* GIAO DIỆN DESKTOP: Bảng công & Nút Giải trình */}
                    <div className="hidden md:block">
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-3">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-700 flex items-center">
                                        <History className="w-4 h-4 mr-2 text-blue-600" /> Lịch sử chấm công
                                    </CardTitle>
                                </div>
                                <div className="flex gap-2">
                                    {/* Modal Giải trình chấm công */}
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50 h-8 text-xs">
                                                <AlertCircle className="w-3 h-3 mr-1.5" /> Báo quên / Giải trình
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle className="text-orange-600 flex items-center"><FileEdit className="w-5 h-5 mr-2" /> Tạo Đơn Giải Trình Chấm Công</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 py-2">
                                                <div className="space-y-2">
                                                    <Label>Ngày cần giải trình</Label>
                                                    <Input type="date" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Loại giải trình</Label>
                                                    <Select>
                                                        <SelectTrigger><SelectValue placeholder="Chọn lý do..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="forgot_in">Quên chấm công VÀO</SelectItem>
                                                            <SelectItem value="forgot_out">Quên chấm công RA</SelectItem>
                                                            <SelectItem value="wrong_time">Chấm công sai giờ / Lỗi máy</SelectItem>
                                                            <SelectItem value="field_work">Đi công tác thực địa (Không ở cty)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2"><Label>Giờ VÀO thực tế</Label><Input type="time" /></div>
                                                    <div className="space-y-2"><Label>Giờ RA thực tế</Label><Input type="time" /></div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Lý do chi tiết</Label>
                                                    <Textarea placeholder="Trình bày lý do..." />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline">Hủy</Button>
                                                <Button className="bg-orange-600 hover:bg-orange-700"><Send className="w-4 h-4 mr-2" /> Gửi duyệt</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <AttendanceTable records={mockAttendance} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB 2: ĐƠN TỪ & NGHỈ PHÉP */}
                <TabsContent value="requests" className="mt-4">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-3">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-700 flex items-center">
                                    <CalendarDays className="w-4 h-4 mr-2 text-emerald-600" /> Danh sách Đơn xin nghỉ
                                </CardTitle>
                            </div>

                            {/* Modal Xin Nghỉ */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs shadow-sm">
                                        <Plus className="w-3 h-3 mr-1.5" /> Tạo Đơn Mới
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-emerald-700 flex items-center"><CalendarDays className="w-5 h-5 mr-2" /> Tạo Đơn Xin Nghỉ</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div className="space-y-2">
                                            <Label>Loại nghỉ phép <span className="text-red-500">*</span></Label>
                                            <Select>
                                                <SelectTrigger><SelectValue placeholder="Chọn loại phép..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="annual">Nghỉ phép năm (Có lương)</SelectItem>
                                                    <SelectItem value="unpaid">Nghỉ không lương</SelectItem>
                                                    <SelectItem value="sick">Nghỉ ốm / Thai sản</SelectItem>
                                                    <SelectItem value="urgent">Nghỉ đột xuất / Việc gia đình</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2"><Label>Từ ngày <span className="text-red-500">*</span></Label><Input type="date" /></div>
                                            <div className="space-y-2"><Label>Đến ngày <span className="text-red-500">*</span></Label><Input type="date" /></div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Lý do chi tiết <span className="text-red-500">*</span></Label>
                                            <Textarea placeholder="Nêu rõ lý do xin nghỉ..." className="h-24" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline">Hủy</Button>
                                        <Button className="bg-emerald-600 hover:bg-emerald-700"><Send className="w-4 h-4 mr-2" /> Gửi Đơn</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent className="p-12 text-center text-slate-500">
                            <CalendarDays className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p>Bạn chưa có đơn xin nghỉ nào trong tháng này.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}