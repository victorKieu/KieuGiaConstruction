"use client";

import { useState } from "react";
import { CheckCircle2, Send, Truck, ShieldCheck, MapPin, Layers } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { submitBidAction, submitOpenBidAction } from "@/lib/action/procurement";

interface VendorQuoteFormProps {
    rfqId: string;
    supplierId?: string;
    items: any[];
    isOpenLink?: boolean;
    isNewSupplier?: boolean;
    initialSupplierData?: any;
}

export default function VendorQuoteForm({ rfqId, supplierId, items, isOpenLink = false, isNewSupplier = false, initialSupplierData }: VendorQuoteFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [profile, setProfile] = useState({
        name: initialSupplierData?.name || "",
        tax_code: initialSupplierData?.tax_code || "",
        phone: initialSupplierData?.phone || "",
        email: initialSupplierData?.email || "",
        address: initialSupplierData?.address || "",
        bank_account: initialSupplierData?.bank_account || "",
        bank_name: initialSupplierData?.bank_name || "",
        latitude: "",
        longitude: ""
    });

    const [bids, setBids] = useState<Record<string, { price: string; days: string }>>({});

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Trình duyệt không hỗ trợ GPS."); return;
        }
        toast.info("Đang lấy tọa độ GPS...");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setProfile(prev => ({ ...prev, latitude: pos.coords.latitude.toString(), longitude: pos.coords.longitude.toString() }));
                toast.success("Đã khóa tọa độ thành công!");
            },
            () => toast.error("Vui lòng cấp quyền vị trí cho trình duyệt."),
            { enableHighAccuracy: true }
        );
    };

    const handleSubmit = async () => {
        const requireProfile = isOpenLink || isNewSupplier;

        if (requireProfile) {
            if (isOpenLink && !profile.name) {
                toast.error("Vui lòng điền Tên Công ty / Đại lý"); return;
            }
            if (!profile.tax_code || !profile.phone || !profile.address) {
                toast.error("Quý đối tác vui lòng điền đầy đủ Thông tin pháp lý bắt buộc (*)");
                return;
            }
        }

        const payloadBids = Object.entries(bids)
            .filter(([_, data]) => data.price && Number(data.price) > 0)
            .map(([itemId, data]) => ({
                rfq_item_id: itemId,
                unit_price: Number(data.price),
                delivery_time_days: Number(data.days) || 0
            }));

        if (payloadBids.length === 0) {
            toast.error("Vui lòng nhập đơn giá cho tối thiểu 1 mặt hàng."); return;
        }

        setIsSubmitting(true);
        let res;

        if (isOpenLink) {
            res = await submitOpenBidAction({ rfq_id: rfqId, bids: payloadBids, profileData: profile });
        } else {
            res = await submitBidAction({
                rfq_id: rfqId,
                supplier_id: supplierId!,
                bids: payloadBids,
                profileData: isNewSupplier ? profile : null
            });
        }

        if (res.success) {
            setIsSuccess(true);
            toast.success("Hệ thống đã mã hóa và ghi nhận dữ liệu!");
        } else {
            toast.error(res.error || "Lỗi xử lý hệ thống.");
            setIsSubmitting(false);
        }
    };

    if (isSuccess) return (
        <Card className="border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 shadow-md">
            <CardContent className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-xl font-bold text-green-700 dark:text-green-400">Dữ liệu đã được nạp lên hệ thống!</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Hồ sơ đối tác và Báo giá của Quý công ty đã được ghi nhận thành công.</p>
            </CardContent>
        </Card>
    );

    const showProfileForm = isOpenLink || isNewSupplier;

    return (
        <div className="space-y-6">
            {showProfileForm && (
                <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/10 shadow-sm">
                    <CardHeader className="pb-3 border-b border-blue-100 dark:border-blue-900/30">
                        <CardTitle className="text-sm font-bold uppercase text-blue-800 dark:text-blue-400 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Xác thực Hồ sơ Đối tác (Self-Onboarding)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {isOpenLink && (
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tên Công ty / Đại lý <span className="text-red-500">*</span></label>
                                <Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Pháp nhân trên giấy phép ĐKKD" className="border-blue-200 dark:border-blue-800 dark:bg-slate-900 dark:text-slate-100" />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mã số thuế <span className="text-red-500">*</span></label>
                            <Input value={profile.tax_code} onChange={e => setProfile({ ...profile, tax_code: e.target.value })} placeholder="Mã số thuế" className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Số điện thoại <span className="text-red-500">*</span></label>
                            <Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="Hotline liên hệ" className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Địa chỉ xuất hóa đơn / Kho bãi <span className="text-red-500">*</span></label>
                            <Input value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} placeholder="Địa chỉ chi tiết" className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100" />
                        </div>

                        <div className="md:col-span-2 bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-dashed border-blue-300 dark:border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-xs text-center sm:text-left">
                                <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center sm:justify-start gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-red-500" /> Xác thực vị trí kho bãi
                                </p>
                                {profile.latitude ? (
                                    <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-1">Đã khóa GPS: {profile.latitude}, {profile.longitude}</p>
                                ) : (
                                    <p className="text-slate-500 dark:text-slate-400 mt-1">Tọa độ được dùng để hệ thống tính cước vận tải tự động.</p>
                                )}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={handleGetLocation} className="shrink-0 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 dark:text-blue-400 dark:border-blue-600">
                                Bật GPS Định vị
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-500" /> Chi tiết bảng khối lượng vật tư
                </h3>
                {items.map((item, idx) => (
                    <Card key={item.id} className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
                        <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 border-b dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                            <div className="md:col-span-2">
                                <span className="text-xs font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded mr-2">{item.material_code || "MÃ-VT"}</span>
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{idx + 1}. {item.item_name}</span>
                                {item.specification && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-2 border-l-2 border-blue-500/50"><strong>Quy cách:</strong> {item.specification}</p>}
                            </div>
                            <div className="text-left md:text-right text-xs text-slate-500 dark:text-slate-400 font-medium">
                                <span className="md:block">Khối lượng: <strong className="text-slate-900 dark:text-slate-100 text-sm">{Number(item.quantity).toLocaleString()}</strong></span>
                                <span className="md:block">ĐVT: <strong className="text-slate-900 dark:text-slate-100">{item.unit}</strong></span>
                            </div>
                        </div>
                        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Đơn giá / {item.unit} (VNĐ) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Input
                                        type="text" inputMode="numeric" placeholder="0" className="h-11 font-bold text-base pr-10 border-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus-visible:ring-blue-500"
                                        value={bids[item.id]?.price ? new Intl.NumberFormat("vi-VN").format(Number(bids[item.id].price)) : ""}
                                        onChange={(e) => setBids({ ...bids, [item.id]: { ...bids[item.id], price: e.target.value.replace(/[^0-9]/g, '') } })}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">đ</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Tiến độ giao</label>
                                <div className="relative">
                                    <Input
                                        type="text" inputMode="numeric" placeholder="VD: 2" className="h-11 pr-14 text-sm border-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus-visible:ring-blue-500"
                                        value={bids[item.id]?.days || ""}
                                        onChange={(e) => setBids({ ...bids, [item.id]: { ...bids[item.id], days: e.target.value.replace(/[^0-9]/g, '') } })}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs">Ngày</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Button size="lg" onClick={handleSubmit} disabled={isSubmitting} className="w-full h-14 font-bold text-base shadow-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
                {isSubmitting ? "Đang mã hóa dữ liệu..." : <><Send className="w-5 h-5 mr-2" /> TRÌNH DUYỆT HỒ SƠ & BÁO GIÁ</>}
            </Button>
        </div>
    );
}