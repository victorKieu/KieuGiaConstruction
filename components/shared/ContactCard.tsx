"use client"

import {
    Card,
    CardContent,
    CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    User,
    Briefcase,
    Mail,
    Phone,
    StickyNote,
    UserCircle,
} from "lucide-react"

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

interface ContactCardProps {
    contact: Contact
    onEdit?: (contact: Contact) => void
    onDelete?: (contactId: string) => void
    onSetPrimary?: (contactId: string) => void
    firstLineSpacing?: string
    compact?: boolean
}

export function ContactCard({
    contact,
    onEdit,
    onDelete,
    onSetPrimary,
    firstLineSpacing,
    compact,
}: ContactCardProps) {
    return (
        <Card>
            <CardContent className="text-sm">
                <div className={`grid ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"} gap-4`}>
                    <div className="space-y-3">
                        <Field icon={<User />} value={contact.name} className={firstLineSpacing} />
                        {!compact && (
                            <>
                                <Field icon={<UserCircle />} value={getGenderLabel(contact.gender)} />
                                <Field icon={<Briefcase />} value={contact.position} />
                            </>
                        )}
                    </div>
                    <div className="space-y-3">
                        <Field icon={<Mail />} value={contact.email} />
                        <Field icon={<Phone />} value={contact.phone} />
                        {!compact && contact.is_primary && (
                            <Badge variant="outline" className="text-xs">Liên hệ chính</Badge>
                        )}
                    </div>
                    {!compact && (
                        <div className="space-y-5">
                            {onEdit && (
                                <Button variant="outline" size="sm" onClick={() => onEdit(contact)}>Sửa</Button>
                            )}
                            {onDelete && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                        const confirm = window.confirm("Bạn có chắc chắn muốn xóa liên hệ này?")
                                        if (confirm) onDelete(contact.id)
                                    }}
                                >
                                    Xóa
                                </Button>
                            )}
                            {!contact.is_primary && onSetPrimary && (
                                <Button variant="secondary" size="sm" onClick={() => onSetPrimary(contact.id)}>
                                    Đặt làm liên hệ chính
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>

            {!compact && contact.notes && (
                <CardFooter className="pt-2">
                    <Field icon={<StickyNote />} value={contact.notes} />
                </CardFooter>
            )}
        </Card>
    )
}

function Field({
    icon,
    value,
    className,
}: {
    icon: React.ReactNode
    value?: string
    className?: string
}) {
    if (!value) return null
    return (
        <p className={`flex items-center gap-2 ${className ?? ""}`}>
            <span className="text-muted-foreground">{icon}</span>
            {value}
        </p>
    )
}

function getGenderLabel(gender: string): string {
    switch (gender) {
        case "male":
            return "♂️ Nam"
        case "female":
            return "♀️ Nữ"
        case "other":
            return "⚧ Khác"
        default:
            return "❓ Không xác định"
    }
}