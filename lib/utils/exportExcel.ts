import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
    // 1. Tạo worksheet từ dữ liệu JSON
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 2. Tạo workbook mới
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 3. Tự động điều chỉnh độ rộng cột (Cơ bản)
    const maxWidth = data.reduce((w, r) => Math.max(w, Object.values(r).join("").length), 10);
    worksheet["!cols"] = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));

    // 4. Xuất file
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};