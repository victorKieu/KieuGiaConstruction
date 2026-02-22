import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { projectId, imageUrl } = body;

        if (!projectId || !imageUrl) {
            return NextResponse.json({ success: false, error: 'Thiếu tham số đầu vào (projectId, imageUrl)' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. LẤY DỮ LIỆU KHẢO SÁT
        const { data: survey } = await supabase
            .from('project_surveys')
            .select('id, survey_details')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const surveyDetails = survey?.survey_details || {};

        // 2. TẢI HÌNH ẢNH BẢN VẼ
        const imageResp = await fetch(imageUrl);
        if (!imageResp.ok) throw new Error('Không thể tải hình ảnh từ URL');

        const arrayBuffer = await imageResp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        const mimeType = imageResp.headers.get('content-type') || 'image/jpeg';

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType
            }
        };

        // 3. GỌI AI PHÂN TÍCH VỚI PROMPT TOÁN HỌC CHUẨN
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

        const prompt = `
Bạn là Kỹ sư Dự toán Xây dựng (QS). Hãy bóc tách khối lượng từ bản vẽ thiết kế.
- Đọc bản vẽ và khảo sát hiện trạng (nếu có) để xác định các hạng mục công việc, cấu kiện, và kích thước liên quan.
- Trích xuất các hạng mục chính (ví dụ: Móng, Tường, Sàn...) và các công tác con (ví dụ: Đào đất, Đổ bê tông...).
- Với mỗi công tác, hãy tìm kiếm các kích thước liên quan (Dài, Rộng, Cao) và số lượng cấu kiện (quantity_factor).
- Luôn tuân thủ đúng cấu trúc JSON được yêu cầu, không thêm bất kỳ văn bản giải thích nào ngoài JSON.
- Luôn kiểm tra kỹ lưỡng để đảm bảo dữ liệu trả về là hợp lệ và có thể parse được.
- Bóc tách càng chi tiết càng tốt, đừng bỏ sót bất kỳ kích thước hoặc công tác nào có thể tìm thấy trên bản vẽ.

5 QUY TẮC TỐI THƯỢNG (PHẢI TUÂN THỦ NGHIÊM NGẶT):

1. KHÔNG TỰ BỊA MÃ ĐỊNH MỨC: Luôn luôn để trường "norm_code": null. Web app sẽ tự động map mã sau.
2. BÓC TÁCH CHI TIẾT (BREAKDOWNS) VÀ CHỦNG LOẠI VẬT TƯ:
   - Phân rã theo từng cấu kiện (VD: Móng M1, Móng M2, Dầm D1, Cột C1...).
   - Đọc kỹ các Text/Ghi chú trên bản vẽ. Nếu bản vẽ có ghi chú cấp phối, mác bê tông, loại gạch, kích thước thép... BẮT BUỘC phải đưa vào tên công tác ("item_name") hoặc diễn giải ("explanation"). VD: "Bê tông đài móng đá 1x2 M250".
3. TRÍCH XUẤT ĐÚNG KÍCH THƯỚC: Chỉ lấy chính xác Số lượng cấu kiện (quantity_factor), Dài (length), Rộng (width), Cao/Dày (height). Kích thước nào không có hoặc không thể suy luận, hãy để là 0.
4. CẤM TUYỆT ĐỐI DÙNG PHÉP TÍNH TRONG JSON: Các trường length, width, height, quantity_factor CHỈ ĐƯỢC PHÉP LÀ MỘT CON SỐ DUY NHẤT (VD: Ghi 106.2 thay vì 46.00 + 60.20). Nếu cần tính tổng, hãy tự nhẩm trong đầu và in ra kết quả cuối cùng.
5. CẤU TRÚC PHÂN CẤP RÕ RÀNG: Nhóm các công tác vào đúng Hạng mục cha (VD: "PHẦN MÓNG", "PHẦN THÂN", "PHẦN HOÀN THIỆN").

Trả về DUY NHẤT một MẢNG JSON theo đúng cấu trúc mẫu sau (không kèm theo bất kỳ văn bản Markdown nào khác):
[
  {
    "section_name": "PHẦN MÓNG",
    "items": [
      {
        "item_name": "Bê tông lót móng đá 4x6 M100",
        "norm_code": null,
        "unit": "m3",
        "details": [
          { "explanation": "Lót đài móng M1", "quantity_factor": 13, "length": 1.55, "width": 1.35, "height": 0.1 }
        ]
      },
      {
        "item_name": "Bê tông đài móng đá 1x2 M250",
        "norm_code": null,
        "unit": "m3",
        "details": [
          { "explanation": "Đài móng M1", "quantity_factor": 13, "length": 1.45, "width": 1.25, "height": 0.6 }
        ]
      }
    ]
  }
]
`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const text = await result.response.text();

        // 4. PARSE DỮ LIỆU JSON (Dọn dẹp rác Markdown nếu có)
        let qtoData = [];
        try {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            qtoData = JSON.parse(cleanText);
        } catch (e) {
            console.error("Lỗi parse JSON:", text);
            throw new Error('AI trả về dữ liệu không chuẩn định dạng JSON. Vui lòng thử lại.');
        }

        // 5. GHI DỮ LIỆU VÀO DATABASE
        await supabase.from('qto_items').delete().eq('project_id', projectId);
        await supabase.from('qto_item_details').delete().eq('project_id', projectId);

        let totalTasks = 0;
        let totalDetails = 0;

        for (const section of qtoData) {
            if (!section.items || section.items.length === 0) continue;

            // 5.1 Chèn Hạng mục lớn (Dùng 'other' để không vi phạm ràng buộc Database)
            const { data: parentData, error: parentError } = await supabase
                .from('qto_items')
                .insert({
                    project_id: projectId,
                    item_name: section.section_name || 'Hạng mục chưa tên',
                    item_type: 'other', // Đã sửa lại thành 'other'
                    quantity: 0,
                    unit: '',
                    unit_price: 0,
                    norm_code: null,
                    is_active: true
                })
                .select('id')
                .single();

            if (parentError || !parentData) {
                console.error("Lỗi chèn section:", parentError.message);
                continue;
            }

            // 5.2 Duyệt và Chèn Công tác con
            for (const item of section.items) {
                const { data: taskData, error: taskError } = await supabase
                    .from('qto_items')
                    .insert({
                        project_id: projectId,
                        parent_id: parentData.id,
                        item_name: item.item_name || 'Công tác chưa tên',
                        quantity: 0,
                        unit: item.unit || '',
                        item_type: 'material',
                        unit_price: 0,
                        norm_code: null,
                        is_active: true
                    })
                    .select('id')
                    .single();

                if (taskError || !taskData) {
                    console.error("Lỗi chèn task:", taskError.message);
                    continue;
                }
                totalTasks++;

                // 5.3 Chèn Chi tiết hao phí (M1, M2...)
                if (item.details && Array.isArray(item.details) && item.details.length > 0) {
                    const detailPayload = item.details.map((d: any) => ({
                        item_id: taskData.id,
                        project_id: projectId,
                        explanation: d.explanation || 'Chi tiết',
                        quantity_factor: Number(d.quantity_factor) || 0,
                        length: Number(d.length) || 0,
                        width: Number(d.width) || 0,
                        height: Number(d.height) || 0
                    }));

                    const { error: detailError } = await supabase.from('qto_item_details').insert(detailPayload);
                    if (!detailError) {
                        totalDetails += detailPayload.length;
                    } else {
                        console.error("Lỗi chèn details:", detailError.message);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `AI đã xử lý xong! Tạo ${totalTasks} công tác và ${totalDetails} dòng diễn giải.`,
            count: totalTasks
        });

    } catch (error: any) {
        console.error('API /api/ai/takeoff ERROR:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}