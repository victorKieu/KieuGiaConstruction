// lib/constants/estimation-macros.ts

export const CONSTRUCTION_MACROS = [
    {
        id: "mong_don",
        name: "Móng đơn bê tông cốt thép",
        description: "Bao gồm đào, lót, ván khuôn, cốt thép, bê tông",
        work_items: [
            { code: "AB.113", name: "Đào móng cột, trụ, hố kiểm tra", unit: "m3", ratio: 1 }, // ratio: hệ số gợi ý
            { code: "AF.111", name: "Bê tông lót móng đá 4x6, mác 100", unit: "m3", ratio: 0.1 },
            { code: "AF.811", name: "Ván khuôn móng cột, móng vuông, chữ nhật", unit: "m2", ratio: 4 },
            { code: "AF.611", name: "Sản xuất, lắp dựng cốt thép móng", unit: "kg", ratio: 50 },
            { code: "AF.211", name: "Bê tông móng, đá 1x2, mác 250", unit: "m3", ratio: 1 },
        ]
    },
    {
        id: "cot_btct",
        name: "Cột BTCT (Tiết diện vuông/chữ nhật)",
        description: "Công tác cột trọn gói",
        work_items: [
            { code: "AF.8113", name: "Ván khuôn cột vuông, chữ nhật", unit: "m2", ratio: 10 },
            { code: "AF.6113", name: "Sản xuất, lắp dựng cốt thép cột", unit: "kg", ratio: 150 },
            { code: "AF.2113", name: "Bê tông cột, đá 1x2, mác 250", unit: "m3", ratio: 1 },
        ]
    },
    {
        id: "dam_san",
        name: "Dầm sàn BTCT",
        description: "Công tác dầm, sàn, mái",
        work_items: [
            { code: "AF.8114", name: "Ván khuôn xà dầm, giằng", unit: "m2", ratio: 8 },
            { code: "AF.8115", name: "Ván khuôn sàn mái", unit: "m2", ratio: 1 },
            { code: "AF.6114", name: "Cốt thép dầm, giằng", unit: "kg", ratio: 120 },
            { code: "AF.6115", name: "Cốt thép sàn mái", unit: "kg", ratio: 80 },
            { code: "AF.2114", name: "Bê tông dầm, sàn, mái", unit: "m3", ratio: 1 },
        ]
    },
    {
        id: "xay_tuong",
        name: "Xây tường gạch ống (Gạch 8x8x18)",
        description: "Xây tường 100/200",
        work_items: [
            { code: "AE.222", name: "Xây tường gạch ống 8x8x18, dày <=10cm", unit: "m3", ratio: 1 },
            { code: "AK.211", name: "Trát tường trong, chiều dày 1.5cm", unit: "m2", ratio: 10 },
            { code: "AK.221", name: "Trát tường ngoài, chiều dày 1.5cm", unit: "m2", ratio: 10 },
        ]
    }
];