"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import supabase from "@/lib/supabase/client"
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem,} from "@/components/ui/select"
interface ContactFormModalProps {
    customerId: string
    contact?: {
        id?: string
        name: string
        gender: string
        position?: string
        email?: string
        phone?: string
        notes?: string
        is_primary?: boolean
    }
    open: boolean
    onClose: () => void
    onSuccess: () => void
}

export function ContactFormModal({
    customerId,
    contact,
    open,
    onClose,
    onSuccess,
}: ContactFormModalProps) {
    const [form, setForm] = useState({
        name: "",
        gender: "",
        position: "",
        email: "",
        phone: "",
        notes: "",
        is_primary: false,
    })

    useEffect(() => {
        if (contact) {
            setForm({
                name: contact.name || "",
                gender: contact.gender || "",
                position: contact.position || "",
                email: contact.email || "",
                phone: contact.phone || "",
                notes: contact.notes || "",
                is_primary: contact.is_primary || false,
            })
        } else {
            setForm({
                name: "",
                gender: "",
                position: "",
                email: "",
                phone: "",
                notes: "",
                is_primary: false,
            })
        }
    }, [contact])

    async function handleSubmit() {
        const payload = {
            ...form,
            customer_id: customerId,
        }

        const { error } = contact?.id
            ? await supabase.from("contacts").update(payload).eq("id", contact.id)
            : await supabase.from("contacts").insert(payload)

        if (error) {
            console.error("Lỗi khi lưu liên hệ:", error.message || error)
            return
        }

        onSuccess()
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{contact?.id ? "Sửa liên hệ" : "Thêm liên hệ"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Input
                        placeholder="Họ tên"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <Select
                        value={form.gender}
                        onValueChange={(value) => setForm({ ...form, gender: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Chọn giới tính" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Nam</SelectItem>
                            <SelectItem value="female">Nữ</SelectItem>
                            <SelectItem value="other">Khác</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Chức vụ"
                        value={form.position}
                        onChange={(e) => setForm({ ...form, position: e.target.value })}
                    />
                    <Input
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    <Input
                        placeholder="Số điện thoại"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                    <Textarea
                        placeholder="Ghi chú"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={form.is_primary}
                            onCheckedChange={(checked) =>
                                setForm({ ...form, is_primary: !!checked })
                            }
                        />
                        <span className="text-sm">Đặt làm liên hệ chính</span>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSubmit}>
                            {contact?.id ? "Lưu thay đổi" : "Thêm liên hệ"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}