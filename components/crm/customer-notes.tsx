"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import supabase from '@/lib/supabase/client';
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Edit, MessageSquare, Trash, PlusCircle } from "lucide-react"

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
    creator_type?: "employee" | "customer" | "supplier"
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
                const { data: notes, error } = await supabase
                    .from("customer_notes")
                    .select("*")
                    .eq("customer_id", customerId)
                    .order("created_at", { ascending: false })

                if (error) throw error

                const notesWithCreator: NoteWithCreator[] = await Promise.all(
                    notes.map(async (note: Note) => {
                        let creator: any = null

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
                        <Card key={i} className="animate-pulse bg-card border-border">
                            <CardHeader className="h-12 bg-muted/50 rounded-t-lg mb-2"></CardHeader>
                            <CardContent className="h-20 bg-muted/30 mx-4 rounded"></CardContent>
                            <CardFooter className="h-8 bg-muted/50 rounded-b-lg mt-2"></CardFooter>
                        </Card>
                    ))}
            </div>
        )
    }

    if (notes.length === 0) {
        return (
            // ✅ FIX: Empty State Styles for Dark Mode
            <Card className="bg-muted/10 border-dashed border-border">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <MessageSquare className="w-10 h-10 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground mb-4">Chưa có ghi chú nào cho khách hàng này</p>
                    <Button variant="outline" className="border-dashed border-border hover:bg-muted/50">
                        <PlusCircle className="w-4 h-4 mr-2" /> Thêm ghi chú mới
                    </Button>
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
                // ✅ FIX: Card Background & Border Colors
                <Card key={note.id} className="bg-card text-card-foreground border-border shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-foreground">
                                    {note.creator_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {note.creator_email}
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted hover:text-foreground">
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="py-4">
                        <p className="text-sm whitespace-pre-line leading-relaxed text-foreground/90">
                            {note.content}
                        </p>
                    </CardContent>

                    <CardFooter className="pt-2 pb-3 bg-muted/30 border-t border-border/50 text-xs text-muted-foreground rounded-b-lg">
                        <div className="flex justify-end w-full">
                            <span>{format(new Date(note.created_at), "PP p", { locale: vi })}</span>
                        </div>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}