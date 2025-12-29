import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SupplierList({ data }: { data: any[] }) {

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'material': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Vật liệu</Badge>;
            case 'furniture': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Nội thất</Badge>;
            case 'subcontractor': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Thầu phụ</Badge>;
            case 'equipment': return <Badge variant="outline" className="bg-slate-100 text-slate-700">Thiết bị</Badge>;
            default: return <Badge variant="outline">Khác</Badge>;
        }
    }

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tên Nhà Cung Cấp</TableHead>
                            <TableHead>Phân loại</TableHead>
                            <TableHead>Người liên hệ</TableHead>
                            <TableHead>Mã số thuế</TableHead>
                            <TableHead>Điện thoại</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-4">Chưa có dữ liệu</TableCell></TableRow> :
                            data.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">
                                        <div>{s.name}</div>
                                        <div className="text-xs text-muted-foreground">{s.email}</div>
                                    </TableCell>
                                    <TableCell>{getTypeBadge(s.type)}</TableCell>
                                    <TableCell>{s.contact_person || '---'}</TableCell>
                                    <TableCell>{s.tax_code}</TableCell>
                                    <TableCell>{s.phone}</TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}