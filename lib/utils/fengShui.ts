// File: lib/utils/fengShui.ts

export type Gender = "nam" | "nu";

export interface FengShuiDirectionResult {
    dirName: string;
    dirId: string;
    star: string;
    type: 'good' | 'bad';
    desc: string;
    degree: number;
    remedy?: string; // Bổ sung trường hóa giải cho từng hướng
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
        remedy: string;
        climateAnalysis: string; // 👈 Sếp thêm dòng này vào đây là xong!
    };
    allDirections: FengShuiDirectionResult[];
}

// 1. Định nghĩa các hướng và ID tương ứng (GIỮ NGUYÊN)
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

// ✅ 2. HÀM PHÂN TÍCH VI KHÍ HẬU (MỚI)
export const analyzeClimate = (degree: number): string => {
    // Bắc (337.5 - 22.5)
    if (degree >= 337.5 || degree < 22.5)
        return "☀️ Nắng: Cường độ bức xạ thấp, dễ thiếu sáng tự nhiên.\n🍃 Gió: Đón gió mùa Đông Bắc. ⚠️ Lưu ý: Phía Nam (sau nhà) sẽ hình thành 'Vùng quẩn gió' (áp lực âm), cần chừa khoảng lùi phía sau đủ rộng để thoát khí, tránh tụ khí tù đọng.";

    // Đông Bắc (22.5 - 67.5)
    if (degree >= 22.5 && degree < 67.5)
        return "⛅ Nắng: Nhận nắng sớm cường độ trung bình.\n🍃 Gió: Hướng gió mùa lạnh. ⚠️ Lưu ý: Phía Tây Nam sau nhà chịu hiệu ứng quẩn gió, hạn chế đặt cửa xả khí uế (WC, bếp) tại vùng áp lực âm này vì khí sẽ bị hút ngược lại.";

    // Đông (67.5 - 112.5)
    if (degree >= 67.5 && degree < 112.5)
        return "🌅 Nắng: Đón nắng bình minh rất tốt, nhưng tích nhiệt nhanh.\n🍃 Gió: Gió lưu thông tốt. ⚠️ Lưu ý: Mặt Tây phía sau nhà nằm trong vùng khuất gió, cần mở ô thoáng đối diện mặt Đông để tạo chênh lệch áp suất, kích hoạt thông gió xuyên phòng.";

    // Đông Nam (112.5 - 157.5)
    if (degree >= 112.5 && degree < 157.5)
        return "⛅ Nắng: Ánh sáng chan hòa, bức xạ nhiệt vừa phải.\n🍃 Gió: Đón gió nồm mát nhất mùa hè. ⚠️ Lưu ý: Phía Tây Bắc sau nhà sẽ tạo ra 'Vùng quẩn gió' lớn, cần tính toán chiều cao nhà hợp lý để dòng khí vuợt qua được, không quẩn lại sân sau.";

    // Nam (157.5 - 202.5)
    if (degree >= 157.5 && degree < 202.5)
        return "☀️ Nắng: Bức xạ mặt trời cao nhưng chiếu góc đứng. Cần mái hiên rộng.\n🍃 Gió: Đón gió cực mát. ⚠️ Lưu ý: Lưng nhà phía Bắc sẽ là vùng khí động học tĩnh (vận tốc gió thấp), cần kết hợp giếng trời ở giữa nhà để hỗ trợ hút khí lên trên (hiệu ứng ống khói).";

    // Tây Nam (202.5 - 247.5)
    if (degree >= 202.5 && degree < 247.5)
        return "🌇 Nắng: Bắt đầu gắt vào trưa chiều, gây tích nhiệt lớn bề mặt.\n🍃 Gió: Dễ gặp gió Tây Nam (gió Lào) khô nóng. ⚠️ Lưu ý: Cần bố trí tiểu cảnh nước hoặc hàng cây cản gió phía trước mặt tiền để làm mát luồng khí trước khi nạp vào nhà.";

    // Tây (247.5 - 292.5)
    if (degree >= 247.5 && degree < 292.5)
        return "🔥 Nắng: Hướng xấu nhất, nắng quái chiều cực gắt. Cần lam chắn nắng 45° hoặc tường đôi.\n🍃 Gió: Hướng khuất của các gió chủ đạo mùa hè. Lượng thông gió tự nhiên kém, bắt buộc phải sử dụng quạt thông gió cưỡng bức và các mảng xanh che chắn.";

    // Tây Bắc (292.5 - 337.5)
    if (degree >= 292.5 && degree < 337.5)
        return "🌇 Nắng: Tích nhiệt lâu vào kết cấu bao che.\n🍃 Gió: Đón gió lạnh về đêm. ⚠️ Lưu ý: Phía Đông Nam sau nhà sẽ là vùng quẩn gió, tuyệt đối không đặt hố ga hay bãi rác ở khu vực này để tránh uế khí cuộn ngược vào không gian sống.";

    return "Đang phân tích...";
};

// 3. Bổ sung Hàm lấy nội dung Hóa Giải (Dễ dàng update nội dung tại đây)
export const getRemedy = (star: string): string => {
    const remedies: Record<string, string> = {
        "Tuyệt Mệnh": "Phong thủy: Đặt bếp hướng Thiên Y để trấn áp. Kiến trúc: Sử dụng vật liệu cách nhiệt và khối nhiệt dày để giữ 'quán tính nhiệt', tránh thất thoát dương khí[cite: 266, 267].",
        "Ngũ Quỷ": "Phong thủy: Đặt bếp hướng Sinh Khí. Kiến trúc: Tăng cường thông gió xuyên phòng bằng sân trong hoặc giếng trời để giải phóng khí uẩn và nhiệt thừa[cite: 349, 363].",
        "Lục Sát": "Phong thủy: Đặt bếp hướng Diên Niên. Kiến trúc: Bố trí không gian đệm như ban công, lô gia để giảm tác động trực tiếp của bức xạ mặt trời vào phòng ngủ[cite: 193, 347].",
        "Họa Hại": "Phong thủy: Đặt bếp hướng Phục Vị. Kiến trúc: Sử dụng lam chắn nắng (ngang hoặc đứng) để điều tiết ánh sáng tán xạ, tránh chói lóa mất tiện nghi nhìn[cite: 212, 353, 358].",
        "Sinh Khí": "Hướng đại cát. Ưu tiên mở cửa kính lớn lấy sáng tự nhiên, đảm bảo diện tích mở cửa tối thiểu 5% diện tích sàn để nạp vượng khí[cite: 258, 357].",
        "Thiên Y": "Hướng tốt cho sức khỏe. Phù hợp đặt phòng ngủ để đón nắng sớm nhẹ nhàng, giúp diệt khuẩn và tăng cường vitamin D cho gia chủ[cite: 206, 208].",
        "Diên Niên": "Hướng hòa thuận. Phù hợp làm phòng khách hoặc không gian sinh hoạt chung để tận dụng hướng gió mát chủ đạo[cite: 320, 323].",
        "Phục Vị": "Hướng bình an. Thích hợp làm phòng làm việc hoặc phòng thờ, nơi cần sự yên tĩnh và ánh sáng ổn định[cite: 207]."
    };
    return remedies[star] || "Tham khảo ý kiến kiến trúc sư của Kiều Gia.";
};

// 4. Bảng Ma Trận Bát Trạch
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

// 5. Hàm tính Cung Mệnh chuẩn (GIỮ NGUYÊN)
export const getCungMenh = (year: number, gender: Gender) => {
    let sum = year.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    while (sum > 9) sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);

    let quaiSo = 0;
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

// 6. Hàm Phân Tích Toàn Diện (GIỮ NGUYÊN VÀ BỔ SUNG REMEDY)
export const evaluateFengShui = (year: number, gender: Gender, degree: number): FullFengShuiAnalysis => {
    const { cung, nhom } = getCungMenh(year, gender);
    const dirId = getDirectionId(degree);
    const currentStar = BAT_TRACH_MATRIX[cung][dirId];
    const directionMap: Record<string, number> = { "N": 0, "NE": 45, "E": 90, "SE": 135, "S": 180, "SW": 225, "W": 270, "NW": 315 };

    const allDirs: FengShuiDirectionResult[] = [
        { id: "N", name: "Bắc" }, { id: "NE", name: "Đông Bắc" }, { id: "E", name: "Đông" }, { id: "SE", name: "Đông Nam" },
        { id: "S", name: "Nam" }, { id: "SW", name: "Tây Nam" }, { id: "W", name: "Tây" }, { id: "NW", name: "Tây Bắc" }
    ].map(d => {
        const starInfo = BAT_TRACH_MATRIX[cung][d.id];
        return { dirId: d.id, dirName: d.name, star: starInfo.star, type: starInfo.type, desc: starInfo.desc, degree: directionMap[d.id], remedy: getRemedy(starInfo.star) };
    });

    return {
        cung, nhom,
        currentDirection: {
            name: getDirectionName(degree), degree: degree, star: currentStar.star, isGood: currentStar.type === 'good', desc: currentStar.desc,
            remedy: getRemedy(currentStar.star),
            climateAnalysis: analyzeClimate(degree) // ✅ Tự động gán phân tích nắng gió
        },
        allDirections: allDirs
    };
};

// 7. Hàm Sinh Văn Bản Báo Cáo (Tiện ích bổ sung cho sếp)
export const generateFengShuiReportText = (ownerName: string, birthYear: number, gender: Gender, analysis: FullFengShuiAnalysis): string => {
    return `[BÁO CÁO PHONG THỦY: ${ownerName.toUpperCase()}]
Năm sinh: ${birthYear} - Mệnh: ${analysis.cung} (${analysis.nhom})
-----------------------------------------
1. KẾT QUẢ ĐO THỰC ĐỊA:
- Hướng đo thực tế: ${analysis.currentDirection.name} (${analysis.currentDirection.degree}°)
- Cung Sao: ${analysis.currentDirection.star} (${analysis.currentDirection.isGood ? '✅ Tốt/Cát' : '❌ Xấu/Hung'})
- Luận giải: ${analysis.currentDirection.desc}

2. PHÂN TÍCH VI KHÍ HẬU (NẮNG & GIÓ):
${analysis.currentDirection.climateAnalysis}

3. LỜI KHUYÊN & HÓA GIẢI:
${analysis.currentDirection.remedy}

CHI TIẾT 8 HƯỚNG BÁT TRẠCH:
${analysis.allDirections.map(d => `- Hướng ${d.dirName} (${d.degree}°): ${d.star} -> ${d.type === 'good' ? '✅ Tốt' : '❌ Xấu'}`).join("\n")}
-----------------------------------------
Thiết Kế Bởi Kiều Gia Construction - We Build - You Live`;
};

// 8. TỪ ĐIỂN KHẢO SÁT LOAN ĐẦU (CẢNH QUAN)
export const LOAN_DAU_DICTIONARY = [
    { id: "lo_xung", name: "Lộ xung sát (Đường đâm)", desc: "Đường thẳng/hẻm đâm trực diện vào mặt tiền nhà, gây sát khí mạnh, tổn đinh hao tài.", remedy: "Xây bình phong chắn khí, dùng gương bát quái lồi, hoặc trồng cây lớn trước nhà." },
    { id: "giac_sat", name: "Giác sát (Góc nhọn)", desc: "Góc nhọn của mái nhà, tường nhà hàng xóm hoặc công trình lớn chĩa thẳng vào cửa.", remedy: "Treo gương bát quái lõm để thu sát, rèm che chắn hoặc đặt chậu cây gai góc (xương rồng)." },
    { id: "co_duong", name: "Cô dương sát", desc: "Có cột điện, trạm biến áp, hoặc cây to đơn lập nằm ngay chính giữa trước mặt tiền.", remedy: "Đặt cặp tỳ hưu đá, trồng cây dâm bụt/cây leo để hóa giải hỏa khí/sát khí." },
    { id: "thien_tram", name: "Thiên trảm sát", desc: "Nhà nằm đối diện khe hở hẹp giữa 2 tòa nhà cao tầng (gió lùa qua khe như đao chém).", remedy: "Dùng rèm cửa dày che chắn, đặt đồng tiền xu ngũ đế hoặc quả cầu pha lê ở bậu cửa." },
    { id: "phan_cung", name: "Phản cung sát", desc: "Đường cong, sông lượn hoặc cầu vượt rẽ ngoặt quay lưng vào nhà (như lưỡi liềm chém).", remedy: "Đặt chậu cây lớn rậm rạp, treo gương lồi hoặc đôi sư tử đá trấn yểm mặt tiền." },
    { id: "cat_cuoc", name: "Cắt cước sát", desc: "Nhà ở ngay sát mép đường cao tốc hoặc đường ray xe lửa, không có vỉa hè lưu không, khí bị cuốn đi mất.", remedy: "Tạo vùng đệm (sân vườn nhỏ phía trước), làm tường rào cách âm, thường xuyên đóng kín cửa mặt tiền." }
];

export const generateLoanDauReportText = (selectedIds: string[]): string => {
    const selectedItems = LOAN_DAU_DICTIONARY.filter(item => selectedIds.includes(item.id));

    if (selectedItems.length === 0) {
        return `[BÁO CÁO KHẢO SÁT LOAN ĐẦU]\nKết luận: Cảnh quan xung quanh hài hòa, chưa phát hiện các hình thế sát khí nghiêm trọng tác động đến công trình. Đủ điều kiện thuận lợi để triển khai thiết kế.`;
    }

    let report = `[BÁO CÁO KHẢO SÁT LOAN ĐẦU - CẢNH QUAN]\nPhát hiện các yếu tố Hình Sát ảnh hưởng đến công trình:\n\n`;
    selectedItems.forEach((item, idx) => {
        report += `${idx + 1}. ${item.name.toUpperCase()}\n- Đánh giá: ${item.desc}\n- Đề xuất hóa giải: ${item.remedy}\n\n`;
    });

    return report + `-----------------------------------------\nLưu ý: Thiết kế kiến trúc cần tích hợp các biện pháp hóa giải nêu trên vào hồ sơ kỹ thuật.`;
};