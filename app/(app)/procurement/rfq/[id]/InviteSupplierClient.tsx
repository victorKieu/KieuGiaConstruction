"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    Send, Copy, CheckCircle2, Clock,
    Link as LinkIcon, UserPlus, Loader2, Eye, XCircle, Globe
} from "lucide-react";
import { inviteSupplierAction } from "@/lib/action/procurement";
import { SupplierSelector } from "@/components/common/SupplierSelector";

interface Supplier {
    id: string;
    name: string;
    code: string;
}

interface InvitedSupplier {
    id: string;
    supplier_id: string;
    token: string;
    status: string;
    submitted_at: string | null;
    supplier: {
        name: string;
        code: string;
        phone?: string;
        email?: string;
    };
}

interface Props {
    rfqId: string;
    publicToken?: string; // Bổ sung prop này
    invitedSuppliers: InvitedSupplier[];
    allSuppliers: Supplier[];
}

export default function InviteSupplierClient({ rfqId, publicToken, invitedSuppliers, allSuppliers }: Props) {
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [isInviting, setIsInviting] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    const invitedIds = invitedSuppliers.map(s => s.supplier_id);
    const availableSuppliers = allSuppliers.filter(s => !invitedIds.includes(s.id));

    const handleInvite = async () => {
        if (!selectedSupplier) {
            toast.warning("Vui lòng chọn một Nhà cung cấp để mời thầu!");
            return;
        }

        setIsInviting(true);
        const res = await inviteSupplierAction(rfqId, selectedSupplier);

        if (res.success) {
            toast.success(res.message);
            setSelectedSupplier("");
        } else {
            toast.error(res.error);
        }
        setIsInviting(false);
    };

    const handleCopyLink = (token: string | undefined, isPublic: boolean = false) => {
        if (!token) {
            toast.error("Lỗi: Không tìm thấy Token của nhà cung cấp này!");
            return;
        }

        const baseUrl = window.location.origin;
        // CHÚ Ý DÒNG NÀY: Link riêng (isPublic = false) phải trỏ vào /portal/bid/
        const url = isPublic ? `${baseUrl}/portal/rfq/${token}` : `${baseUrl}/portal/bid/${token}`;

        navigator.clipboard.writeText(url).then(() => {
            setCopiedToken(token);
            toast.success(isPublic ? "Đã copy Link Công Khai!" : "Đã copy Link Định Danh!");
            setTimeout(() => setCopiedToken(null), 3000);
        });
    };

    const renderStatus = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="text-slate-500 border-slate-300"><Clock className="w-3 h-3 mr-1" /> Chưa xem</Badge>;
            case 'viewed': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200"><Eye className="w-3 h-3 mr-1" /> Đã xem link</Badge>;
            case 'submitted': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Đã nộp giá</Badge>;
            case 'declined': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200"><XCircle className="w-3 h-3 mr-1" /> Từ chối</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* THÊM MỚI: KHU VỰC LINK CÔNG KHAI */}
            <Card className="p-5 border-2 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 text-base">
                            <Globe className="w-5 h-5" /> Link Mời Thầu Công Khai (Public Link)
                        </h3>
                        <p className="text-sm text-emerald-600/80 dark:text-emerald-500/80 mt-1">
                            Sử dụng link này để đăng lên các Group Zalo/Facebook. NCC mới khi bấm vào sẽ được yêu cầu nhập Tên công ty & SĐT trước khi báo giá. Hệ thống sẽ tự động lưu họ vào danh bạ.
                        </p>
                    </div>
                    <Button
                        onClick={() => handleCopyLink(publicToken, true)}
                        className={`shrink-0 h-10 ${copiedToken === publicToken ? 'bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white shadow-md`}
                    >
                        {copiedToken === publicToken ? (
                            <><CheckCircle2 className="w-4 h-4 mr-2" /> Đã Copy Link Mở</>
                        ) : (
                            <><LinkIcon className="w-4 h-4 mr-2" /> Copy Link Gửi Hàng Loạt</>
                        )}
                    </Button>
                </div>
            </Card>

            {/* Khu vực thêm Nhà cung cấp cũ */}
            <Card className="p-4 border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-sm flex flex-col md:flex-row items-end md:items-center gap-4">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-1.5">
                        Chỉ định đích danh Nhà cung cấp (từ danh bạ)
                    </label>
                    <SupplierSelector
                        selectedId={selectedSupplier}
                        onSelect={(id) => setSelectedSupplier(id)}
                        placeholder="Nhập tên để tìm Nhà cung cấp hiện hữu..."
                    />
                </div>
                <Button
                    onClick={handleInvite}
                    disabled={isInviting || !selectedSupplier}
                    className="w-full md:w-auto h-10 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    {isInviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Chỉ định mời thầu
                </Button>
            </Card>

            {/* Bảng danh sách đã mời */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <TableRow>
                            <TableHead className="w-[50px] text-center font-bold">STT</TableHead>
                            <TableHead className="font-bold">Nhà cung cấp đã định danh</TableHead>
                            <TableHead className="text-center font-bold">Trạng thái</TableHead>
                            <TableHead className="text-right font-bold w-[250px]">Link Báo Giá Riêng</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invitedSuppliers.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-500">Chưa chỉ định Nhà cung cấp cụ thể nào.</TableCell></TableRow>
                        ) : (
                            invitedSuppliers.map((invite, index) => (
                                <TableRow key={invite.id}>
                                    <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="font-bold text-slate-800 dark:text-slate-200">{invite.supplier.name}</div>
                                        <div className="text-xs text-slate-500">{invite.supplier.phone || "Chưa có SDT"} - Mã: {invite.supplier.code}</div>
                                    </TableCell>
                                    <TableCell className="text-center">{renderStatus(invite.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline" size="sm"
                                            onClick={() => handleCopyLink(invite.token, false)}
                                            className={copiedToken === invite.token ? "bg-green-50 border-green-200 text-green-700" : "bg-white border-blue-200 text-blue-700"}
                                        >
                                            {copiedToken === invite.token ? <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Đã Copy</> : <><Copy className="w-4 h-4 mr-1.5" /> Copy Link Riêng</>}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}