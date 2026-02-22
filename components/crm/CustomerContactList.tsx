"use client"

import { useEffect, useState } from "react"
import supabase from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ContactFormModal } from "./ContactFormModal"
import { ContactCard } from "@/components/shared/ContactCard"
import { Plus, UserX } from "lucide-react" // Thêm icon

interface Contact {
    id: string
    name: string
    gender: string
    position?: string
    email?: string
    phone?: string
    is_primary?: boolean
    notes?: string
}

export function CustomerContactList({ customerId }: { customerId: string }) {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const [editingContact, setEditingContact] = useState<Contact | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    async function fetchContacts() {
        setLoading(true)
        const { data, error } = await supabase
            .from("contacts")
            .select("id, name, gender, position, email, phone, is_primary, notes")
            .eq("customer_id", customerId)
            .order("is_primary", { ascending: false })

        if (error) {
            console.error("Lỗi khi lấy liên hệ:", error.message || error)
            return
        }

        setContacts(data || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchContacts()
    }, [customerId])

    async function handleDelete(contactId: string) {
        // Có thể thay bằng AlertDialog của Shadcn sau này
        const confirm = window.confirm("Bạn có chắc chắn muốn xóa liên hệ này?")

        if (!confirm) return

        const { error } = await supabase.from("contacts").delete().eq("id", contactId)
        if (error) {
            console.error("Lỗi khi xóa liên hệ:", error.message || error)
            return
        }

        fetchContacts()
    }

    async function handleSetPrimary(contactId: string) {
        const updates = contacts.map((c) => ({
            id: c.id,
            name: c.name,
            is_primary: c.id === contactId,
        }))

        const { error } = await supabase.from("contacts").upsert(updates)
        if (error) {
            console.error("Lỗi khi cập nhật liên hệ chính:", error.message || error)
            return
        }
        fetchContacts()
    }

    function openEdit(contact: Contact | null) {
        setEditingContact(contact)
        setIsModalOpen(true)
    }

    function closeModal() {
        setEditingContact(null)
        setIsModalOpen(false)
    }

    if (loading) {
        return <p className="text-sm text-muted-foreground text-center py-4">Đang tải danh sách liên hệ...</p>
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3">
                {contacts.length === 0 ? (
                    // ✅ FIX: Empty State đẹp hơn cho Dark Mode
                    <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border rounded-lg bg-muted/30 text-muted-foreground text-sm">
                        <UserX className="w-8 h-8 mb-2 opacity-50" />
                        <p>Chưa có người liên hệ nào</p>
                    </div>
                ) : (
                    contacts.map((c) => (
                        <ContactCard
                            key={c.id}
                            contact={c}
                            onEdit={(c) => openEdit(c)}
                            onDelete={(id) => handleDelete(id)}
                            onSetPrimary={(id) => handleSetPrimary(id)}
                            firstLineSpacing="mb-3"
                            compact={false}
                        />
                    ))
                )}
            </div>

            {/* ✅ FIX: Nút thêm mới dạng Dashed full-width */}
            <Button
                variant="outline"
                className="w-full border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 h-10"
                onClick={() => openEdit(null)}
            >
                <Plus className="w-4 h-4 mr-2" /> Thêm người liên hệ
            </Button>

            {isModalOpen && (
                <ContactFormModal
                    customerId={customerId}
                    contact={editingContact ?? undefined}
                    open={isModalOpen}
                    onClose={closeModal}
                    onSuccess={() => {
                        fetchContacts()
                        closeModal()
                    }}
                />
            )}
        </div>
    )
}