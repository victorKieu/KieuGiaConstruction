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
    } else if (chuc === 1) {
        chuoi = " mười";
        if (donvi === 1) chuoi += " một";
    } else if (daydu && donvi > 0) {
        chuoi = " lẻ";
    }

    if (donvi === 5 && chuc >= 1) {
        chuoi += " lăm";
    } else if (donvi > 1 || (donvi === 1 && chuc === 0)) {
        chuoi += " " + CHU_SO[donvi];
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
            const s = docKhoi(ty, i > 0 && so > 999);
            chuoi = s + hauto + chuoi;
        }
        i++;
        hauto = " " + TEN_LOP[i];
        so = Math.floor(so / 1000);
    } while (so > 0);

    return chuoi.trim();
}

export function readMoneyToText(amount: number): string {
    if (!amount || amount === 0) return "Không đồng";
    let str = docSo(amount);
    // Viết hoa chữ cái đầu
    str = str.charAt(0).toUpperCase() + str.slice(1);
    return str + " đồng chẵn";
}