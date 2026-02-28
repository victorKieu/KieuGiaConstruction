// File: lib/utils/fengShui.ts

export type Gender = "nam" | "nu";

// Các hướng cơ bản và khoảng độ
export const DIRECTIONS = [
    { name: "Bắc", min: 337.5, max: 360, id: "N" },
    { name: "Bắc", min: 0, max: 22.5, id: "N" },
    { name: "Đông Bắc", min: 22.5, max: 67.5, id: "NE" },
    { name: "Đông", min: 67.5, max: 112.5, id: "E" },
    { name: "Đông Nam", min: 112.5, max: 157.5, id: "SE" },
    { name: "Nam", min: 157.5, max: 202.5, id: "S" },
    { name: "Tây Nam", min: 202.5, max: 247.5, id: "SW" },
    { name: "Tây", min: 247.5, max: 292.5, id: "W" },
    { name: "Tây Bắc", min: 292.5, max: 337.5, id: "NW" },
];

export const getDirectionFromDegree = (degree: number) => {
    return DIRECTIONS.find(d => degree >= d.min && degree < d.max)?.id || "N";
};

export const getDirectionName = (degree: number) => {
    return DIRECTIONS.find(d => degree >= d.min && degree < d.max)?.name || "Bắc";
};

// Tính quái số (Cung Mệnh) theo năm sinh
export const getCungMenh = (year: number, gender: Gender) => {
    let sum = year.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    while (sum > 9) {
        sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    }

    let quaiSo = 0;
    if (year < 2000) {
        quaiSo = gender === "nam" ? 11 - sum : 4 + sum;
    } else {
        quaiSo = gender === "nam" ? 10 - sum : 5 + sum;
    }
    while (quaiSo > 9) quaiSo -= 9;

    // Quy tắc Bát Trạch: Nam 5 -> Khôn (2), Nữ 5 -> Cấn (8)
    if (quaiSo === 5) quaiSo = gender === "nam" ? 2 : 8;

    const mapCung: Record<number, { cung: string, nhom: string }> = {
        1: { cung: "Khảm", nhom: "Đông Tứ Mệnh" },
        2: { cung: "Khôn", nhom: "Tây Tứ Mệnh" },
        3: { cung: "Chấn", nhom: "Đông Tứ Mệnh" },
        4: { cung: "Tốn", nhom: "Đông Tứ Mệnh" },
        6: { cung: "Càn", nhom: "Tây Tứ Mệnh" },
        7: { cung: "Đoài", nhom: "Tây Tứ Mệnh" },
        8: { cung: "Cấn", nhom: "Tây Tứ Mệnh" },
        9: { cung: "Ly", nhom: "Đông Tứ Mệnh" },
    };
    return { quaiSo, ...mapCung[quaiSo] };
};

// Bảng tra cứu Bát Trạch (Hàng: Cung Mệnh, Cột: Hướng nhà)
const BAT_TRACH_MATRIX: Record<string, Record<string, { result: string, type: 'good' | 'bad', desc: string }>> = {
    "Khảm": { "N": { result: "Phục Vị", type: "good", desc: "Bình yên, ổn định" }, "S": { result: "Diên Niên", type: "good", desc: "Gia đạo hòa thuận" }, "E": { result: "Thiên Y", type: "good", desc: "Sức khỏe, trường thọ" }, "SE": { result: "Sinh Khí", type: "good", desc: "Tài lộc, thăng tiến" }, "NW": { result: "Lục Sát", type: "bad", desc: "Thị phi, kiện tụng" }, "NE": { result: "Ngũ Quỷ", type: "bad", desc: "Tai họa, bệnh tật" }, "SW": { result: "Tuyệt Mệnh", type: "bad", desc: "Phá sản, tang thương" }, "W": { result: "Họa Hại", type: "bad", desc: "Thất bại, xúi quẩy" } },
    // (Đã rút gọn các Cung khác thành Đông Tứ / Tây Tứ để code chạy mượt, logic tra bảng thực tế sẽ viết Full như trên)
};

// Hàm gộp lấy kết quả (Giả lập nhanh cho Demo)
export const evaluateFengShui = (year: number, gender: Gender, degree: number) => {
    const { cung, nhom } = getCungMenh(year, gender);
    const dirId = getDirectionFromDegree(degree);
    const dirName = getDirectionName(degree);

    // Thuật toán gộp: Đông Tứ Mệnh hợp Đông Tứ Trạch (N, S, E, SE) | Tây Tứ Mệnh hợp Tây Tứ Trạch (NW, SW, NE, W)
    const dongTuTrach = ["N", "S", "E", "SE"];
    const isDongTuMenh = nhom === "Đông Tứ Mệnh";
    const isHuongHop = isDongTuMenh ? dongTuTrach.includes(dirId) : !dongTuTrach.includes(dirId);

    // Mapping giả lập (Thực tế sẽ móc từ BAT_TRACH_MATRIX ở trên)
    const goodResults = ["Sinh Khí (Đại Cát)", "Thiên Y (Sức Khỏe)", "Diên Niên (Gia Đạo)", "Phục Vị (Bình Yên)"];
    const badResults = ["Tuyệt Mệnh (Đại Hung)", "Ngũ Quỷ (Tai Họa)", "Lục Sát (Thị Phi)", "Họa Hại (Trắc Trở)"];

    // Random kết quả cho Demo (Sau này ốp bảng Matrix chuẩn vào)
    const index = Math.floor(degree / 45) % 4;
    const finalResult = isHuongHop ? goodResults[index] : badResults[index];

    return {
        cung, nhom, dirName, degree,
        result: finalResult,
        isGood: isHuongHop
    };
};