import * as React from "react";
import { Card, CardContent, Typography, Button, Snackbar, Alert, Stack, Box } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";

export default function ExcelQuantityUploadMUI({ projectId, onSuccess }: { projectId: string, onSuccess?: () => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [alert, setAlert] = React.useState<{ type: "success" | "error", message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setAlert({ type: "error", message: "Chưa chọn file Excel" });
    setLoading(true);
    setAlert(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const res = await fetch("/api/quantities/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Lỗi khi upload file");
      setFile(null);
      setAlert({ type: "success", message: "Upload thành công!" });
      onSuccess?.();
    } catch (err: any) {
      setAlert({ type: "error", message: err.message });
    }
    setLoading(false);
  };

  return (
    <Card sx={{ maxWidth: 950, mx: "auto", my: 2, borderRadius: 3, boxShadow: 2 }}>
      <CardContent>
        <Typography variant="h5" fontWeight={600} align="center" gutterBottom>
          Upload file Excel khối lượng
        </Typography>
        <Box component="form" onSubmit={handleSubmit} textAlign="center">
          <input
            style={{ display: "none" }}
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
          />
          <label htmlFor="excel-upload">
            <Button variant="outlined" component="span" startIcon={<UploadFileIcon />}>
              Chọn file Excel
            </Button>
          </label>
          <Typography variant="body2" mt={1} mb={2} color="text.secondary">
            {file ? file.name : "Chưa chọn file nào"}
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" mt={1}>
            <Button type="submit" variant="contained" disabled={loading}>
              Upload
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