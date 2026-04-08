// lib/utils/readNumber.ts

const CHU_SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const TEN_LOP = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

function docHangChuc(so: number, daydu: boolean): string {
    let chuoi = "";
    const chuc = Math.floor(so / 10);
    const donvi = so % 10;

    if (chuc > 1) {
        chuoi = " " + CHU_SO[chuc] + " mươi";
        if (donvi === 1) chuoi += " mốt";
        else if (donvi === 4) chuoi += " tư";
        else if (donvi === 5) chuoi += " lăm";
        else if (donvi > 0) chuoi += " " + CHU_SO[donvi];
    } else if (chuc === 1) {
        chuoi = " mười";
        if (donvi === 5) chuoi += " lăm";
        else if (donvi > 0) chuoi += " " + CHU_SO[donvi];
    } else { // chuc === 0
        if (daydu && donvi > 0) {
            chuoi = " lẻ " + CHU_SO[donvi];
        } else if (donvi > 0) {
            chuoi = " " + CHU_SO[donvi];
        }
    }
    return chuoi;
}

function docKhoi(so: number, daydu: boolean): string {
    let chuoi = "";
    const tram = Math.floor(so / 100);
    const soConLai = so % 100;

    if (daydu || tram > 0) {
        chuoi = " " + CHU_SO[tram] + " trăm";
        chuoi += docHangChuc(soConLai, true);
    } else {
        chuoi = docHangChuc(soConLai, false);
    }
    return chuoi;
}

function docSo(so: number): string {
    if (so === 0) return CHU_SO[0];
    let chuoi = "", hauto = "";
    let i = 0;

    do {
        const ty = so % 1000;
        if (ty > 0) {
            // Đã fix lỗi i > 0: Chỉ cần so > 999 là khối hiện tại bắt buộc phải đọc "không trăm..."
            const s = docKhoi(ty, so > 999);
            chuoi = s + hauto + chuoi;
        }
        i++;
        hauto = " " + TEN_LOP[i];
        so = Math.floor(so / 1000);
    } while (so > 0);

    // Xóa khoảng trắng thừa do cộng chuỗi
    return chuoi.replace(/\s+/g, ' ').trim();
}

export function readMoneyToText(amount: number): string {
    if (!amount || amount === 0) return "Không đồng";

    // Làm tròn số để tránh lỗi parse khi user truyền số thập phân (VD: 1000.5)
    amount = Math.round(amount);

    let str = docSo(amount);
    // Viết hoa chữ cái đầu
    str = str.charAt(0).toUpperCase() + str.slice(1);
    return str + " đồng chẵn";
}