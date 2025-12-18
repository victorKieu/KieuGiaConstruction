"use client";

import Link from "next/link";
import { Printer, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContractActions({ id }: { id: string }) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                In phiếu
            </Button>

            <Button variant="outline" size="sm" asChild>
                <Link href={`/crm/contracts/${id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Sửa
                </Link>
            </Button>

            <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}