"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import supabase from '@/lib/supabase/client';
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Edit, MessageSquare, Trash } from "lucide-react"

import {
    fetchEmployeeByAuthUserId,
    fetchCustomerByAuthUserId,
    fetchSupplierByAuthUserId,
} from "@/lib/db/fetch-by-auth-user-id"

// Types
interface Note {
    id: string
    content: string
    created_at: string
    created_by: string
    creator_type?: "employee" | "customer" | "supplier" // Nếu có
    // ...
}

interface NoteWithCreator extends Note {
    creator_name: string
    creator_email: string
}

interface CustomerNotesProps {
    customerId: string
}

export function CustomerNotes({ customerId }: CustomerNotesProps) {
    const [notes, setNotes] = useState<NoteWithCreator[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchNotesWithCreators() {
            setIsLoading(true)
            try {
                // Lấy notes
                const { data: notes, error } = await supabase
                    .from("customer_notes")
                    .select("*")
                    .eq("customer_id", customerId)
                    .order("created_at", { ascending: false })

                if (error) throw error

                // Nếu có nhiều loại creator, ưu tiên dùng note.creator_type
                // Nếu chỉ employee tạo note, có thể bỏ các nhánh còn lại
                const notesWithCreator: NoteWithCreator[] = await Promise.all(
                    notes.map(async (note: Note) => {
                        let creator: any = null

                        // Nếu bạn có field creator_type thì dùng như sau:
                        if (note.creator_type === "employee" || !note.creator_type) {
                            creator = await fetchEmployeeByAuthUserId(note.created_by)
                        } else if (note.creator_type === "customer") {
                            creator = await fetchCustomerByAuthUserId(note.created_by)
                        } else if (note.creator_type === "supplier") {
                            creator = await fetchSupplierByAuthUserId(note.created_by)
                        }

                        return {
                            ...note,
                            creator_name: creator?.name || "Không xác định",
                            creator_email: creator?.email || "",
                        }
                    })
                )

                setNotes(notesWithCreator)
            } catch (error) {
                console.error("Error fetching customer notes:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchNotesWithCreators()
    }, [customerId])

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array(3)
                    .fill(0)
                    .map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-12 bg-muted/20"></CardHeader>
                            <CardContent className="h-20 bg-muted/10"></CardContent>
                            <CardFooter className="h-8 bg-muted/20"></CardFooter>
                        </Card>
                    ))}
            </div>
        )
    }

    if (notes.length === 0) {
        return (
            <Card>
                <CardContent className="text-center py-10">
                    <p className="text-muted-foreground mb-4">Chưa có ghi chú nào cho khách hàng này</p>
                    <Button>Thêm ghi chú mới</Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button>
                    <MessageSquare className="mr-2 h-4 w-4" /> Thêm ghi chú mới
                </Button>
            </div>

            {notes.map((note) => (
                <Card key={note.id}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center justify-between">
                            <span>Ghi chú bởi: {note.creator_name}</span>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-2">
                        <p className="text-sm whitespace-pre-line">{note.content}</p>
                    </CardContent>
                    <CardFooter className="pt-2 text-xs text-muted-foreground">
                        <div className="flex justify-between w-full">
                            <span>Email: {note.creator_email}</span>
                            <span>{format(new Date(note.created_at), "PPp", { locale: vi })}</span>
                        </div>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}