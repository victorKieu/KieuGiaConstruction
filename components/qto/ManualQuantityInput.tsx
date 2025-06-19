import * as React from "react";
import {
    Box, Card, CardContent, Typography, Table, TableHead, TableRow, TableCell,
    TableBody, TextField, IconButton, Button, Snackbar, Alert, Stack
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";

export default function QuantityInputMUI({ projectId, onSuccess }: { projectId: string, onSuccess?: () => void }) {
    const [rows, setRows] = React.useState([{ work_item: "", unit: "", quantity: "", description: "" }]);
    const [loading, setLoading] = React.useState(false);
    const [alert, setAlert] = React.useState<{ type: "success" | "error", message: string } | null>(null);

    const handleChange = (idx: number, field: string, value: string) => {
        const updatedRows = [...rows];
        updatedRows[idx][field] = value;
        setRows(updatedRows);
    };

    const addRow = () => setRows([...rows, { work_item: "", unit: "", quantity: "", description: "" }]);
    const removeRow = (idx: number) => setRows(rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAlert(null);
        try {
            const res = await fetch("/api/quantities/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId, workItems: rows }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Lỗi không xác định");
            setRows([{ work_item: "", unit: "", quantity: "", description: "" }]);
            setAlert({ type: "success", message: "Lưu thành công!" });
            onSuccess?.();
        } catch (err: any) {
            setAlert({ type: "error", message: err.message });
        }
        setLoading(false);
    };

    return (
        <Card sx={{ maxWidth: 950, mx: "auto", my: 4, borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
                <Typography variant="h5" fontWeight={600} align="center" gutterBottom>
                    Bóc tách khối lượng thủ công
                </Typography>
                <Box component="form" onSubmit={handleSubmit}>
                    <Table sx={{ minWidth: 650 }} size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Đầu việc</TableCell>
                                <TableCell>Đơn vị</TableCell>
                                <TableCell>Khối lượng</TableCell>
                                <TableCell>Mô tả</TableCell>
                                <TableCell align="center">Xóa</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>
                                        <TextField
                                            fullWidth required
                                            size="small"
                                            placeholder="Nhập đầu việc"
                                            variant="outlined"
                                            value={row.work_item}
                                            onChange={e => handleChange(idx, "work_item", e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            fullWidth required
                                            size="small"
                                            placeholder="Đơn vị"
                                            variant="outlined"
                                            value={row.unit}
                                            onChange={e => handleChange(idx, "unit", e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            fullWidth required
                                            size="small"
                                            type="number"
                                            inputProps={{ min: 0 }}
                                            placeholder="Khối lượng"
                                            variant="outlined"
                                            value={row.quantity}
                                            onChange={e => handleChange(idx, "quantity", e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Mô tả"
                                            variant="outlined"
                                            value={row.description}
                                            onChange={e => handleChange(idx, "description", e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton onClick={() => removeRow(idx)} disabled={rows.length === 1} color="error">
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Stack direction="row" spacing={2} justifyContent="center" mt={3}>
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={addRow}>
                            Thêm dòng
                        </Button>
                        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={loading}>
                            Lưu
                        </Button>
                    </Stack>
                </Box>
            </CardContent>
            <Snackbar open={!!alert} autoHideDuration={3500} onClose={() => setAlert(null)}>
                {alert &&
                    <Alert onClose={() => setAlert(null)} severity={alert.type} sx={{ width: '100%' }}>
                        {alert.message}
                    </Alert>
                }
            </Snackbar>
        </Card>
    );
}