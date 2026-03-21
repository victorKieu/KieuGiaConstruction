"use server";

import { createClient } from "@/lib/supabase/server";
import * as cheerio from "cheerio";

const SCRAPER_API_KEY = "f77340d2e052311bc0b67bc10fa7ca78";

export async function crawlNormFromUrl(url: string) {
    console.log(`\n[CRAWLER] 🚀 BẮT ĐẦU CÀO TRỰC TIẾP LINK: ${url}`);

    if (!url || !url.includes("dinhmuconline.com/dinhmuc/")) {
        return { success: false, error: "Vui lòng dán đúng link chi tiết từ DinhMucOnline (Ví dụ: https://dinhmuconline.com/dinhmuc/104481)" };
    }

    try {
        let apiUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true`;

        const res = await fetch(apiUrl, { method: "GET" });
        const html = await res.text();

        if (html.includes("Just a moment") || html.includes("Cloudflare")) {
            return { success: false, error: "Tường lửa vẫn chặn. Vui lòng thử lại sau ít phút!" };
        }

        const $ = cheerio.load(html);

        // Dọn dẹp script/style để lấy text thô cho sạch
        $("script, style").remove();
        const bodyText = $("body").text().replace(/\s+/g, ' ').trim();

        // 1. LẤY MÃ ĐỊNH MỨC
        let codeUpper = "";
        const codeMatch = bodyText.match(/Nội dung:\s*([A-Z0-9\.]+)/i);
        if (codeMatch) {
            codeUpper = codeMatch[1].toUpperCase();
        } else {
            const fallbackMatch = bodyText.match(/([A-Z]{2}\.\d{5})/i);
            if (fallbackMatch) codeUpper = fallbackMatch[1].toUpperCase();
        }

        // 2. LẤY TÊN CÔNG TÁC (Chính xác từ đoạn "Nội dung: SA.11111 Phá dỡ móng...")
        let name = "";
        const nameMatch = bodyText.match(/Nội dung:\s*[A-Z0-9\.]+\s+(.*?)\s+Định mức hao phí/i);
        if (nameMatch) {
            name = nameMatch[1].trim();
        } else {
            name = $("h4").first().text().trim() || $("h3").first().text().trim();
        }

        // 3. LẤY ĐƠN VỊ TÍNH
        let unit = "Lần";
        const unitMatch = bodyText.match(/Định mức hao phí cho\s+(.*?)\s+sản phẩm/i);
        if (unitMatch) {
            unit = unitMatch[1].trim();
        }

        // 4. BÓC TÁCH BẢNG HAO PHÍ (Xử lý bảng không có cột Mã)
        const rawDetails: any[] = [];

        $("table tr").each((_, el) => {
            const tds = $(el).find("td");
            // Dòng hao phí chuẩn của họ thường có từ 3 cột trở lên (Tên, Đơn vị, Hao phí,...)
            if (tds.length >= 3) {
                let resName = $(tds[0]).text().replace(/\s+/g, ' ').trim();
                let resUnit = $(tds[1]).text().replace(/\s+/g, ' ').trim();
                let qtyText = $(tds[2]).text().replace(/\s+/g, ' ').trim();

                // Lọc bỏ dòng tiêu đề và kiểm tra xem cột số 3 có phải là con số không
                if (resName && resName.toLowerCase() !== 'tên hao phí' && qtyText && qtyText !== '-') {
                    const quantity = parseFloat(qtyText.replace(/,/g, '.'));

                    if (!isNaN(quantity) && quantity > 0) {
                        // Tự động chế tạo Mã vật tư (Vì web không có)
                        let prefix = "VL";
                        if (resUnit.toLowerCase() === 'công' || resUnit.toLowerCase() === 'ngày') prefix = "NC";
                        else if (resUnit.toLowerCase() === 'ca') prefix = "M";

                        // Tạo mã độc nhất từ Tên: VD "NC_NHANCONGBAC307"
                        const nameSlug = resName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 15);
                        let resCode = `${prefix}_${nameSlug}`;

                        rawDetails.push({
                            code: resCode,
                            name: resName,
                            unit: resUnit,
                            quantity: quantity
                        });
                    }
                }
            }
        });

        // 5. LƯU/CẬP NHẬT VẬT TƯ VÀO SUPABASE
        const supabase = await createClient();
        const detailsWithIds = [];

        if (rawDetails.length > 0) {
            const resourcesToUpsert = rawDetails.map(r => ({
                code: r.code, name: r.name, unit: r.unit, group_code: r.code.split('_')[0]
            }));

            // Đẩy vào database và lấy lại ID
            const { data: dbResources } = await supabase.from('resources').upsert(resourcesToUpsert, { onConflict: 'code' }).select('id, code');

            for (const r of rawDetails) {
                const dbRes = dbResources?.find(db => db.code === r.code);
                if (dbRes) {
                    detailsWithIds.push({ resource_id: dbRes.id, resource: { code: r.code, name: r.name, unit: r.unit }, quantity: r.quantity });
                }
            }
        }

        console.log(`[CRAWLER] ✅ CÀO XONG - Tên: ${name} | Có ${detailsWithIds.length} vật tư!`);
        return { success: true, data: { code: codeUpper || "CHƯA_RÕ", name, unit, type: "state", details: detailsWithIds } };

    } catch (e: any) {
        console.error("Crawl Exception:", e);
        return { success: false, error: "Lỗi đường truyền: " + e.message };
    }
}