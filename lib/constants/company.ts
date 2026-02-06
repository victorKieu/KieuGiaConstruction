// lib/constants/company.ts

export const COMPANY_INFO = {
    name: "CÔNG TY TNHH TM DV XÂY DỰNG KIỀU GIA",
    address: "72 Đường Số 1, KNO Thắng Lợi, KP. Chiêu Liêu, P. Dĩ An, TP. HCM, Việt Nam", // Thay địa chỉ thật của bạn
    taxCode: "3703296412",
    representative: "Ông Kiều Quang Huy", // Người đại diện (Giám đốc)
    position: "Giám đốc",
    phone: "0949 033 913",
    email: "info@kieugia-construction.biz.vn",
    bankAccount: {
        number: "1031003939",
        bankName: "Ngân hàng Vietcombank"
    }
};

// Hàm helper để lấy nhanh (nếu cần mở rộng lấy từ DB sau này)
export function getCompanyInfo() {
    return COMPANY_INFO;
}