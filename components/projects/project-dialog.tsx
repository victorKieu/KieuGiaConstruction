"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material"
import { Project } from "@/app/projects/page"

type Props = {
    open: boolean
    project: Project | null
    onClose: () => void
    onSave: (project: Project) => void
}

export default function ProjectDialog({ open, project, onClose, onSave }: Props) {
    const [form, setForm] = useState<Project>(
        project ?? { id: "", name: "", code: "", owner: "", location: "", investor: "", start_date: "", end_date: "", status: "", progress_percent: 0, description: "" }
    )

    useEffect(() => {
        setForm(project ?? { id: "", name: "", code: "", owner: "", location: "", investor: "", start_date: "", end_date: "", status: "", progress_percent: 0, description: "" })
    }, [project, open])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setForm(f => ({ ...f, [name]: value }))
    }

    const handleSubmit = () => {
        onSave(form)
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{form.id ? "Sửa dự án" : "Thêm dự án"}</DialogTitle>
            <DialogContent>
                <TextField margin="normal" label="Tên dự án" name="name" value={form.name || ""} onChange={handleChange} fullWidth />
                <TextField margin="normal" label="Mã dự án" name="code" value={form.code || ""} onChange={handleChange} fullWidth />
                <TextField margin="normal" label="Chủ đầu tư" name="investor" value={form.investor || ""} onChange={handleChange} fullWidth />
                <TextField margin="normal" label="Địa điểm" name="location" value={form.location || ""} onChange={handleChange} fullWidth />
                <TextField margin="normal" label="Trạng thái" name="status" value={form.status || ""} onChange={handleChange} fullWidth />
                <TextField margin="normal" label="Tiến độ (%)" name="progress_percent" type="number" value={form.progress_percent || 0} onChange={handleChange} fullWidth />
                <TextField margin="normal" label="Ngày bắt đầu" name="start_date" type="date" InputLabelProps={{ shrink: true }} value={form.start_date || ""} onChange={handleChange} fullWidth />
                <TextField margin="normal" label="Ngày kết thúc" name="end_date" type="date" InputLabelProps={{ shrink: true }} value={form.end_date || ""} onChange={handleChange} fullWidth />
                <TextField margin="normal" label="Mô tả" name="description" value={form.description || ""} onChange={handleChange} fullWidth multiline minRows={2} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button variant="contained" onClick={handleSubmit}>{form.id ? "Lưu" : "Thêm"}</Button>
            </DialogActions>
        </Dialog>
    )
}