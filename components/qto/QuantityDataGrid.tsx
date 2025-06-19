import * as React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Typography, Stack, Button } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

const columns = [
    { field: 'stt', headerName: 'STT', width: 70 },
    { field: 'drawing_code', headerName: 'Ký hiệu BV', width: 120, editable: true },
    { field: 'work_code', headerName: 'Mã hiệu', width: 120, editable: true },
    { field: 'work_name', headerName: 'Danh mục công tác', width: 260, editable: true },
    { field: 'unit', headerName: 'Đơn vị', width: 80, editable: true },
    { field: 'quantity', headerName: 'Khối lượng', width: 120, editable: true, type: 'number' },
    { field: 'unit_price_vl', headerName: 'Đơn giá VL', width: 120, editable: true, type: 'number' },
    { field: 'unit_price_nc', headerName: 'Đơn giá NC', width: 120, editable: true, type: 'number' },
    { field: 'unit_price_mtc', headerName: 'Đơn giá MTC', width: 120, editable: true, type: 'number' },
    { field: 'total_vl', headerName: 'Thành tiền VL', width: 140, valueGetter: ({ row }) => row.unit_price_vl * row.quantity },
    { field: 'total_nc', headerName: 'Thành tiền NC', width: 140, valueGetter: ({ row }) => row.unit_price_nc * row.quantity },
    { field: 'total_mtc', headerName: 'Thành tiền MTC', width: 140, valueGetter: ({ row }) => row.unit_price_mtc * row.quantity },
    { field: 'unit_price_sum', headerName: 'Đơn giá tổng', width: 120, valueGetter: ({ row }) => row.unit_price_vl + row.unit_price_nc + row.unit_price_mtc },
    { field: 'total_sum', headerName: 'Thành tiền tổng', width: 150, valueGetter: ({ row }) => (row.unit_price_vl + row.unit_price_nc + row.unit_price_mtc) * row.quantity },
    { field: 'note', headerName: 'Ghi chú', width: 180, editable: true },
];

export default function QuantityDataGrid({ rows, setRows }) {
    return (
        <Box sx={{ width: '100%', minWidth: 1100 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
                BẢNG CHI TIẾT KHỐI LƯỢNG CÔNG VIỆC
            </Typography>
            <Box sx={{ height: 420, width: '100%' }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    editMode="cell"
                    onCellEditCommit={(params) => {
                        const updatedRows = rows.map((row) =>
                            row.id === params.id ? { ...row, [params.field]: params.value } : row
                        );
                        setRows(updatedRows);
                    }}
                    disableSelectionOnClick
                    getRowId={(row) => row.id}
                />
            </Box>
            <Stack direction="row" spacing={2} mt={2}>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setRows([
                    ...rows,
                    { id: Date.now(), stt: rows.length + 1, drawing_code: '', work_code: '', work_name: '', unit: '', quantity: 0, unit_price_vl: 0, unit_price_nc: 0, unit_price_mtc: 0, note: '' }
                ])}>Thêm dòng</Button>
            </Stack>
        </Box>
    );
}