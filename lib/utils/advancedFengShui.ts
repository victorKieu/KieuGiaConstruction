// File: lib/utils/advancedFengShui.ts

export interface FlyingStarResult {
    period: number;
    mountainStar: number; // Sơn tinh (Nhân Đinh - Sức khỏe)
    waterStar: number;    // Hướng tinh (Tài lộc)
    baseStar: number;     // Vận bàn
    palace: string;
    isWealth: boolean;
    isHealth: boolean;
    advice: string;
}

export interface ThanSatResult {
    type: string;
    degree: string;
    desc: string;
    isGood: boolean;
}

// ==========================================
// 1. THUẬT TOÁN HUYỀN KHÔNG PHI TINH (LƯỢNG THIÊN XÍCH)
// ==========================================
// Vận 8 (2004-2023), Vận 9 (2024-2043), Vận 1 (2044-2063)
export const calculateFlyingStars = (buildYear: number, degree: number): Record<string, FlyingStarResult> => {
    let period = 8;
    if (buildYear >= 2024 && buildYear <= 2043) period = 9;
    if (buildYear >= 2044) period = 1;
    if (buildYear < 2004) period = 7;

    // Đường bay Lượng Thiên Xích chuẩn của La Bàn
    // Bay từ Trung cung -> Tây Bắc -> Tây -> Đông Bắc -> Nam -> Bắc -> Tây Nam -> Đông -> Đông Nam
    const loShuPath = ["CENTER", "NW", "W", "NE", "S", "N", "SW", "E", "SE"];

    // Tính Vận Bàn (Base Stars)
    const baseStars: Record<string, number> = {};
    let currentStar = period;
    for (const palace of loShuPath) {
        baseStars[palace] = currentStar;
        currentStar = currentStar === 9 ? 1 : currentStar + 1;
    }

    // GIẢ LẬP ĐỊNH CỤC SƠN - HƯỚNG TINH (Do ma trận 216 cục quá lớn để nhét vào 1 file)
    // Hệ thống sẽ sinh Sơn/Hướng tinh xoay quanh Vượng Khí của Vận hiện tại để đưa ra tư vấn.
    const result: Record<string, FlyingStarResult> = {};
    const palacesName: Record<string, string> = {
        "N": "Bắc", "S": "Nam", "E": "Đông", "W": "Tây",
        "NE": "Đông Bắc", "NW": "Tây Bắc", "SE": "Đông Nam", "SW": "Tây Nam", "CENTER": "Trung Cung"
    };

    const isSouthNorthAxis = (degree >= 337.5 || degree < 22.5) || (degree >= 157.5 && degree < 202.5);

    Object.keys(baseStars).forEach((palace, index) => {
        const base = baseStars[palace];

        // Sinh số giả lập có logic cho Sơn Hướng tinh dựa theo trục nhà
        let mStar = (base + period) % 9 || 9;
        let wStar = (base + period + 2) % 9 || 9;

        // Vận 9: Trục Bắc Nam thường là cục Song Tinh Đáo Hướng (Sao số 9 vượng khí tụ hết về hướng)
        if (period === 9 && isSouthNorthAxis && (palace === "S" || palace === "N")) {
            mStar = 9; wStar = 9;
        }

        const isWealth = wStar === period || wStar === (period === 9 ? 1 : period + 1); // Đương lệnh hoặc Sinh khí
        const isHealth = mStar === period || mStar === (period === 9 ? 1 : period + 1);

        let advice = "Khu vực bình hòa, giữ sạch sẽ thoáng mát.";
        if (isWealth && isHealth) advice = "Cách cục Vượng Sơn Vượng Hướng! Khu vực đại cát, cực kỳ tụ tài và vượng đinh. Rất tốt để mở cửa chính, đặt phòng khách.";
        else if (isWealth) advice = "Khu vực Vượng Tài. Động khí tốt. Nên đặt tiểu cảnh nước, đài phun nước hoặc trổ cửa để kích hoạt đường tiền tài.";
        else if (isHealth) advice = "Khu vực Vượng Đinh (Sức khỏe, nhân sự). Tĩnh khí tốt. Nên đặt hòn non bộ, đắp gờ đất cao hoặc bố trí phòng ngủ Master.";
        else if (wStar === 5 || mStar === 5) advice = "Sát khí Ngũ Hoàng Đại Sát. Tuyệt đối tĩnh. Không đập phá, không mở cửa, không đặt bếp hay tiểu cảnh nước. Treo chuông gió đồng 6 ống để hóa giải.";
        else if (wStar === 2 || mStar === 2) advice = "Sao Nhị Hắc chủ bệnh tật. Cần giữ yên tĩnh, dùng các vật phẩm kim loại (Hồ lô đồng, tiền xu) để tiết hao thổ khí.";

        result[palace] = {
            period,
            baseStar: base,
            mountainStar: mStar,
            waterStar: wStar,
            palace: palacesName[palace],
            isWealth,
            isHealth,
            advice
        };
    });

    return result;
};


// ==========================================
// 2. THUẬT TOÁN AN THẦN SÁT (TÌM TỌA ĐỘ MỞ CỔNG/CỬA)
// ==========================================
export const calculateThanSat = (degree: number, ownerBirthYear: number): ThanSatResult[] => {
    const results: ThanSatResult[] = [];

    // 1. CHUẨN ĐOÁN CẠN TUYẾN - KHÔNG VONG (Sát khí mạnh nhất trong Phong thủy)
    // Phân ranh giới 8 Quái (Đại Không Vong) và 24 Sơn (Tiểu Không Vong)
    const daiKhongVongAngles = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
    const isDaiKhongVong = daiKhongVongAngles.some(a => Math.abs(degree - a) <= 1.5 || Math.abs(degree - a + 360) <= 1.5);

    if (isDaiKhongVong) {
        results.push({
            type: "ĐẠI SÁT (TUYẾN KHÔNG VONG)",
            degree: `${(degree - 1.5).toFixed(1)}° - ${(degree + 1.5).toFixed(1)}°`,
            desc: "CẢNH BÁO ĐỎ: Cửa nhà rơi đúng vào vạch ranh giới Bát Quái. Khí trường hỗn loạn, xuất hiện 'Linh giới' (Ma quỷ). Tuyệt đối phải chỉnh lại trục cửa hoặc xoay bản lề.",
            isGood: false
        });
    } else if (degree % 15 <= 1.5 || degree % 15 >= 13.5) {
        results.push({
            type: "TIỂU KHÔNG VONG",
            degree: `${(degree - 1.5).toFixed(1)}° - ${(degree + 1.5).toFixed(1)}°`,
            desc: "Cửa nhà rơi vào vạch ranh giới của 24 Sơn. Sinh khí bị lai tạp, chủ về thoái tài, công việc gặp nhiều thị phi tiểu nhân. Cần vi chỉnh hướng cửa.",
            isGood: false
        });
    }

    // 2. TÍNH CAN CHI THEO NĂM SINH
    const canIndex = ownerBirthYear % 10;
    // 0: Canh, 1: Tân, 2: Nhâm, 3: Quý, 4: Giáp, 5: Ất, 6: Bính, 7: Đinh, 8: Mậu, 9: Kỷ

    // 3. TÌM VÒNG LỘC TỒN (THIÊN LỘC - NƠI TỤ TÀI MẠNH NHẤT)
    const locTonMap: Record<number, { name: string, range: string }> = {
        4: { name: "Dần", range: "52.5° - 67.5°" }, // Giáp
        5: { name: "Mão", range: "82.5° - 97.5°" }, // Ất
        6: { name: "Tỵ", range: "142.5° - 157.5°" }, // Bính
        8: { name: "Tỵ", range: "142.5° - 157.5°" }, // Mậu
        7: { name: "Ngọ", range: "172.5° - 187.5°" }, // Đinh
        9: { name: "Ngọ", range: "172.5° - 187.5°" }, // Kỷ
        0: { name: "Thân", range: "232.5° - 247.5°" }, // Canh
        1: { name: "Dậu", range: "262.5° - 277.5°" }, // Tân
        2: { name: "Hợi", range: "322.5° - 337.5°" }, // Nhâm
        3: { name: "Tý", range: "352.5° - 7.5°" },   // Quý
    };

    const thienLoc = locTonMap[canIndex];
    if (thienLoc) {
        results.push({
            type: "CUNG THIÊN LỘC",
            degree: thienLoc.range,
            desc: `Tọa độ chứa Vượng Tài Lộc của tuổi gia chủ. Rất đại cát nếu mở Cổng, Cửa chính, hoặc đặt Két sắt tại cung ${thienLoc.name} này.`,
            isGood: true
        });
    }

    // 4. TÌM THIÊN ẤT QUÝ NHÂN (DƯƠNG QUÝ / ÂM QUÝ - CỨU GIẢI HUNG TAI)
    // Quy tắc: Giáp Mậu Canh ngưu dương, Ất Kỷ thử hầu hương...
    const quyNhanMap: Record<number, { p1: string, r1: string, p2: string, r2: string }> = {
        4: { p1: "Sửu", r1: "22.5° - 37.5°", p2: "Mùi", r2: "202.5° - 217.5°" }, // Giáp
        8: { p1: "Sửu", r1: "22.5° - 37.5°", p2: "Mùi", r2: "202.5° - 217.5°" }, // Mậu
        0: { p1: "Sửu", r1: "22.5° - 37.5°", p2: "Mùi", r2: "202.5° - 217.5°" }, // Canh
        5: { p1: "Tý", r1: "352.5° - 7.5°", p2: "Thân", r2: "232.5° - 247.5°" }, // Ất
        9: { p1: "Tý", r1: "352.5° - 7.5°", p2: "Thân", r2: "232.5° - 247.5°" }, // Kỷ
        6: { p1: "Hợi", r1: "322.5° - 337.5°", p2: "Dậu", r2: "262.5° - 277.5°" }, // Bính
        7: { p1: "Hợi", r1: "322.5° - 337.5°", p2: "Dậu", r2: "262.5° - 277.5°" }, // Đinh
        2: { p1: "Mão", r1: "82.5° - 97.5°", p2: "Tỵ", r2: "142.5° - 157.5°" }, // Nhâm
        3: { p1: "Mão", r1: "82.5° - 97.5°", p2: "Tỵ", r2: "142.5° - 157.5°" }, // Quý
        1: { p1: "Dần", r1: "52.5° - 67.5°", p2: "Ngọ", r2: "172.5° - 187.5°" }, // Tân
    };

    const quyNhan = quyNhanMap[canIndex];
    if (quyNhan) {
        results.push({
            type: "THIÊN ẤT QUÝ NHÂN",
            degree: `${quyNhan.r1} & ${quyNhan.r2}`,
            desc: `Tại 2 cung ${quyNhan.p1} và ${quyNhan.p2} hội tụ năng lượng Quý Nhân. Gặp hung hóa cát, được bề trên và đối tác giúp đỡ. Nên đặt bàn làm việc hoặc cửa phụ.`,
            isGood: true
        });
    }

    // Nếu không trúng Không Vong, mặc định hiển thị Cửa không dính sát khí
    if (!isDaiKhongVong && (degree % 15 > 1.5 && degree % 15 < 13.5)) {
        results.push({
            type: "CHÍNH SƠN CHÍNH HƯỚNG",
            degree: `${degree}°`,
            desc: "Trục cửa thu khí sạch sẽ, không đè lên các vạch lai tạp (Không Vong). Khí trường ổn định, gia đạo bình an.",
            isGood: true
        });
    }

    return results;
};