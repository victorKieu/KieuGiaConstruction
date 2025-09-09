"use client"

import { useEffect, useState } from "react"
import supabase from "@/lib/supabase/client"
import { CardContent} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ContactFormModal } from "./ContactFormModal"
import { ContactCard } from "@/components/shared/ContactCard"
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
        return <p className="text-muted-foreground">Đang tải liên hệ...</p>
    }

    return (
        <div className="space-y-3">
            {contacts.length === 0 ? (
                <p className="text-muted-foreground">Chưa có người liên hệ nào</p>
            ) : (
                    contacts.map((c) => (
                        <ContactCard key={c.id}
                            contact={c}
                            onEdit={(c) => openEdit(c)}
                            onDelete={(id) => handleDelete(id)}
                            onSetPrimary={(id) => handleSetPrimary(id)}
                            firstLineSpacing="mb-3"
                            compact={false}
                        />
                    ))
            )}

            <div className="flex justify-center">
                <CardContent className="flex justify-center">
                    <Button onClick={() => openEdit(null)}>Thêm liên hệ</Button>
                </CardContent>
            </div> 

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