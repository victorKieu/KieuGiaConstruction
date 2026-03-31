"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { CalendarDays, AlertCircle, Send, History, FileEdit, Plus } from "lucide-react";
import { AttendanceTable, AttendanceRecord } from "@/components/hrm/AttendanceTable";

// ✅ CHỈ CẦN IMPORT COMPONENT NÀY, BÊN TRONG NÓ ĐÃ CÓ SẴN GPS VÀ API
import { MobileCheckIn } from "@/components/hrm/MobileCheckIn";

// Mock data
const mockAttendance: AttendanceRecord[] = [
    { id: "1", date: "01/04/2026", employeeCode: "KG-001", name: "Kiều Quang Huy", checkIn: "07:55", checkOut: "17:15", status: "Đủ công", location: "Trụ sở chính (10.912, 106.718)" },
    { id: "2", date: "01/04/2026", employeeCode: "KG-002", name: "Trần Văn Thợ", checkIn: "08:15", checkOut: "17:00", status: "Đi trễ", location: "Công trình Dĩ An (10.925, 106.730)" },
    { id: "3", date: "01/04/2026", employeeCode: "KG-003", name: "Lê Thị Kế Toán", checkIn: "07:50", checkOut: "", status: "Quên giờ ra", location: "Trụ sở chính (10.912, 106.718)" },
];

export default function AttendancePage() {
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

                <TabsContent value="checkin" className="space-y-4 mt-4">

                    {/* ✅ GIAO DIỆN MOBILE: Gọi component MobileCheckIn ra là xong */}
                    <div className="block md:hidden">
                        <MobileCheckIn />
                    </div>

                    {/* ✅ GIAO DIỆN DESKTOP: Bảng công & Nút Giải trình */}
                    <div className="hidden md:block">
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-3">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-700 flex items-center">
                                        <History className="w-4 h-4 mr-2 text-blue-600" /> Lịch sử chấm công
                                    </CardTitle>
                                </div>
                                <div className="flex gap-2">
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