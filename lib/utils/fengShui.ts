// File: lib/utils/fengShui.ts

export type Gender = "nam" | "nu";

export interface FengShuiDirectionResult {
    dirName: string;
    dirId: string;
    star: string;
    type: 'good' | 'bad';
    desc: string;
    degree: number;
}

export interface FullFengShuiAnalysis {
    cung: string;
    nhom: string;
    currentDirection: {
        name: string;
        degree: number;
        star: string;
        isGood: boolean;
        desc: string;
    };
    allDirections: FengShuiDirectionResult[];
}

// 1. Định nghĩa các hướng và ID tương ứng
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

export const getDirectionId = (degree: number) => DIRECTIONS.find(d => degree >= d.min && degree < d.max)?.id || "N";
export const getDirectionName = (degree: number) => DIRECTIONS.find(d => degree >= d.min && degree < d.max)?.name || "Bắc";

// 2. Bảng Ma Trận Bát Trạch đầy đủ (Chuẩn phong thủy)
const BAT_TRACH_MATRIX: Record<string, Record<string, { star: string, type: 'good' | 'bad', desc: string }>> = {
    "Khảm": {
        "N": { star: "Phục Vị", type: "good", desc: "Bình yên, ổn định" },
        "S": { star: "Diên Niên", type: "good", desc: "Gia đạo hòa thuận" },
        "E": { star: "Thiên Y", type: "good", desc: "Sức khỏe, trường thọ" },
        "SE": { star: "Sinh Khí", type: "good", desc: "Tài lộc, thăng tiến" },
        "NW": { star: "Lục Sát", type: "bad", desc: "Thị phi, kiện tụng" },
        "NE": { star: "Ngũ Quỷ", type: "bad", desc: "Tai họa, bệnh tật" },
        "SW": { star: "Tuyệt Mệnh", type: "bad", desc: "Phá sản, tang thương" },
        "W": { star: "Họa Hại", type: "bad", desc: "Thất bại, xúi quẩy" }
    },
    "Khôn": {
        "NE": { star: "Sinh Khí", type: "good", desc: "Cát tường, phú quý" },
        "W": { star: "Thiên Y", type: "good", desc: "Sức khỏe dồi dào" },
        "NW": { star: "Diên Niên", type: "good", desc: "Mối quan hệ tốt" },
        "SW": { star: "Phục Vị", type: "good", desc: "Gia tăng sức mạnh" },
        "N": { star: "Tuyệt Mệnh", type: "bad", desc: "Cực xấu, tổn thọ" },
        "S": { star: "Lục Sát", type: "bad", desc: "Tranh chấp, tai tiếng" },
        "E": { star: "Họa Hại", type: "bad", desc: "Thị phi, tổn tài" },
        "SE": { star: "Ngũ Quỷ", type: "bad", desc: "Bệnh tật, lo âu" }
    },
    "Chấn": {
        "E": { star: "Phục Vị", type: "good", desc: "Vững vàng, an yên" },
        "SE": { star: "Diên Niên", type: "good", desc: "Gia đình êm ấm" },
        "N": { star: "Thiên Y", type: "good", desc: "Phúc lộc đầy nhà" },
        "S": { star: "Sinh Khí", type: "good", desc: "Tiền tài rực rỡ" },
        "W": { star: "Tuyệt Mệnh", type: "bad", desc: "Nguy hiểm, suy sụp" },
        "NW": { star: "Ngũ Quỷ", type: "bad", desc: "Mất mát, xui xẻo" },
        "NE": { star: "Lục Sát", type: "bad", desc: "Rối ren, cãi vã" },
        "SW": { star: "Họa Hại", type: "bad", desc: "Kém may mắn" }
    },
    "Tốn": {
        "SE": { star: "Phục Vị", type: "good", desc: "Thành công vững chắc" },
        "E": { star: "Diên Niên", type: "good", desc: "Quan hệ bền vững" },
        "S": { star: "Thiên Y", type: "good", desc: "Sống thọ, an lạc" },
        "N": { star: "Sinh Khí", type: "good", desc: "Phát triển nhanh" },
        "NE": { star: "Tuyệt Mệnh", type: "bad", desc: "Tai ương bất ngờ" },
        "SW": { star: "Ngũ Quỷ", type: "bad", desc: "Trộm cắp, hỏa hoạn" },
        "W": { star: "Lục Sát", type: "bad", desc: "Kiện cáo, tà khí" },
        "NW": { star: "Họa Hại", type: "bad", desc: "Vất vả, khó khăn" }
    },
    "Càn": {
        "NW": { star: "Phục Vị", type: "good", desc: "Sức mạnh tinh thần" },
        "SW": { star: "Diên Niên", type: "good", desc: "Hạnh phúc lâu dài" },
        "NE": { star: "Thiên Y", type: "good", desc: "Gặp may mắn lớn" },
        "W": { star: "Sinh Khí", type: "good", desc: "Danh tiếng lẫy lừng" },
        "S": { star: "Tuyệt Mệnh", type: "bad", desc: "Ảnh hưởng tính mạng" },
        "E": { star: "Ngũ Quỷ", type: "bad", desc: "Bất hòa, hỏng việc" },
        "N": { star: "Lục Sát", type: "bad", desc: "Mất ngủ, lo âu" },
        "SE": { star: "Họa Hại", type: "bad", desc: "Tài sản tiêu tán" }
    },
    "Đoài": {
        "W": { star: "Phục Vị", type: "good", desc: "Niềm tin, hy vọng" },
        "NE": { star: "Diên Niên", type: "good", desc: "Mọi sự hanh thông" },
        "SW": { star: "Thiên Y", type: "good", desc: "Bệnh tật thuyên giảm" },
        "NW": { star: "Sinh Khí", type: "good", desc: "Vinh hoa phú quý" },
        "E": { star: "Tuyệt Mệnh", type: "bad", desc: "Khó khăn bủa vây" },
        "N": { star: "Họa Hại", type: "bad", desc: "Tiền bạc hao hụt" },
        "SE": { star: "Lục Sát", type: "bad", desc: "Mất việc, thị phi" },
        "S": { star: "Ngũ Quỷ", type: "bad", desc: "Xung đột dữ dội" }
    },
    "Cấn": {
        "NE": { star: "Phục Vị", type: "good", desc: "Kiên định, tự tin" },
        "W": { star: "Diên Niên", type: "good", desc: "Gia đình yên ổn" },
        "NW": { star: "Thiên Y", type: "good", desc: "Quý nhân phù trợ" },
        "SW": { star: "Sinh Khí", type: "good", desc: "Tiền tài phát đạt" },
        "SE": { star: "Tuyệt Mệnh", type: "bad", desc: "Thất thoát lớn" },
        "N": { star: "Ngũ Quỷ", type: "bad", desc: "Phiền muộn kéo dài" },
        "E": { star: "Lục Sát", type: "bad", desc: "Tình duyên trắc trở" },
        "S": { star: "Họa Hại", type: "bad", desc: "Việc gì cũng khó" }
    },
    "Ly": {
        "S": { star: "Phục Vị", type: "good", desc: "Thông minh, sáng suốt" },
        "N": { star: "Diên Niên", type: "good", desc: "Nhiều người giúp đỡ" },
        "SE": { star: "Thiên Y", type: "good", desc: "May mắn về tiền bạc" },
        "E": { star: "Sinh Khí", type: "good", desc: "Quan lộ rộng mở" },
        "NW": { star: "Tuyệt Mệnh", type: "bad", desc: "Tổn hại nhân khẩu" },
        "W": { star: "Ngũ Quỷ", type: "bad", desc: "Kiện tụng, cháy nổ" },
        "SW": { star: "Lục Sát", type: "bad", desc: "Gia đình xáo trộn" },
        "NE": { star: "Họa Hại", type: "bad", desc: "Tai bay vạ gió" }
    }
};

// 3. Hàm tính Cung Mệnh chuẩn
export const getCungMenh = (year: number, gender: Gender) => {
    let sum = year.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    while (sum > 9) sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);

    let quaiSo = 0;
    // Công thức tính quái số chuẩn cho thế kỷ 20 và 21
    if (year < 2000) {
        quaiSo = gender === "nam" ? 11 - sum : 4 + sum;
    } else {
        quaiSo = gender === "nam" ? 10 - sum : 5 + sum;
    }
    while (quaiSo > 9) quaiSo -= 9;
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

// 4. Hàm Phân Tích Toàn Diện (Hàm chính dùng cho Form)
export const evaluateFengShui = (year: number, gender: Gender, degree: number): FullFengShuiAnalysis => {
    const { cung, nhom } = getCungMenh(year, gender);
    const dirId = getDirectionId(degree);
    const dirName = getDirectionName(degree);

    // Tra cứu sao của hướng hiện tại
    const currentStar = BAT_TRACH_MATRIX[cung][dirId];

    // Lấy danh sách tất cả các hướng để phân tích kỹ thuật (Bếp, Giường, Thờ...)
    const directionMap: Record<string, number> = {
        "N": 0, "NE": 45, "E": 90, "SE": 135,
        "S": 180, "SW": 225, "W": 270, "NW": 315
    };

    const allDirs: FengShuiDirectionResult[] = [
        { id: "N", name: "Bắc" }, { id: "NE", name: "Đông Bắc" },
        { id: "E", name: "Đông" }, { id: "SE", name: "Đông Nam" },
        { id: "S", name: "Nam" }, { id: "SW", name: "Tây Nam" },
        { id: "W", name: "Tây" }, { id: "NW", name: "Tây Bắc" }
    ].map(d => {
        const starInfo = BAT_TRACH_MATRIX[cung][d.id];
        return {
            dirId: d.id,
            dirName: d.name,
            star: starInfo.star,
            type: starInfo.type,
            desc: starInfo.desc,
            degree: directionMap[d.id] // 👈 Gán số độ tương ứng để Compass sử dụng
        };
    });

    return {
        cung,
        nhom,
        currentDirection: {
            name: dirName,
            degree: degree,
            star: currentStar.star,
            isGood: currentStar.type === 'good',
            desc: currentStar.desc
        },
        allDirections: allDirs
    };
};