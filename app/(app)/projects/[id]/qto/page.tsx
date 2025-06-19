'use client'
import { Box, Button } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useRouter } from "next/navigation"
import * as React from 'react'
import ExcelQuantityUpload from '@/components/qto/ExcelQuantityUpload'
import ManualQuantityInput from '@/components/qto/ManualQuantityInput'
import QuantityDataGrid from '@/components/qto/QuantityDataGrid'

export default function QTOPage({ params }: { params: { id: string } }) {
    const { id } = params
    const router = useRouter()
    const [rows, setRows] = React.useState<unknown[]>([])

    return (
        <Box
            sx={{
                width: "95vw",
                maxWidth: 1400,
                mx: "auto",
                pt: 2,
                pb: 4
            }}
        >
            <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                sx={{ mb: 2 }}
                onClick={() => router.push("/projects")}
            >
                Quay lại danh sách dự án
            </Button>
            {/* Upload Excel */}
            <Box
                sx={{
                    width: "100%",
                    boxShadow: 2,
                    borderRadius: 2,
                    mb: 3,
                    p: { xs: 1, md: 2 },
                    background: "#fff"
                }}
            >
                <ExcelQuantityUpload projectId={id} onSuccess={() => { }} />
            </Box>
            {/* Nhập thủ công */}
            <Box
                sx={{
                    width: "100%",
                    boxShadow: 2,
                    borderRadius: 2,
                    mb: 3,
                    p: { xs: 1, md: 2 },
                    background: "#fff"
                }}
            >
                <ManualQuantityInput projectId={id} onSuccess={() => { }} />
            </Box>
            {/* DataGrid */}
            <Box
                sx={{
                    width: "100%",
                    overflowX: "auto",
                    background: "#fff",
                    boxShadow: 2,
                    borderRadius: 2,
                    p: { xs: 0.5, md: 2 },
                    mb: 3
                }}
            >
                <Box sx={{ minWidth: 1300 }}>
                    <QuantityDataGrid rows={rows} setRows={setRows} />
                </Box>
            </Box>
        </Box>
    )
}