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
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // Bản 1.0 Pro (Rất ổn định)

        const prompt = `
Generate a detailed Bill of Quantities (BOQ) based on the house plan provided in the PDF document.

Instructions:
- Analyze the provided house plan PDF to identify all relevant components such as rooms, dimensions, materials, and structural elements.
- Calculate quantities for materials including but not limited to concrete, bricks, timber, steel, finishes, plumbing, and electrical installations.
- Organize the BOQ in a clear, logical structure categorizing items by construction trade or section.
- Include units of measurement, quantities, and brief descriptions for each item.
- Ensure accuracy by cross-verifying quantities with the dimensions given in the plan.
- If certain details are missing or unclear in the plan, identify these gaps explicitly.

Steps:
1. Extract and interpret the layout, dimensions, and structural details from the PDF.
2. List and categorize all materials and components necessary for the construction.
3. Compute quantities based on calculations derived from the plan.
4. Present the BOQ in a tabulated or structured format, easy to read and understand.

Output Format:
- Provide the BOQ as a structured table or list with columns/fields including: Item Number, Description, Unit, Quantity, and Remarks (if needed).

Notes:
- Assume standard construction practices unless specified.
- Request additional information if the PDF lacks critical data.

Respond with the complete BOQ based solely on the provided PDF data. If you cannot process attachments directly, guide the user on how to share textual details or images necessary for the BOQ generation.

- Always translate into Vietnamese

5 ESSENTIAL RULES (MUST BE STRICTLY ADHERED TO):

1. DO NOT CREATE YOUR OWN NORM CODES: Always leave the "norm_code" field as null. The web app will automatically map the code later.

2. BREAKDOWNS AND MATERIAL TYPES:

- Break down by individual components (e.g., Foundation M1, Foundation M2, Beam D1, Column C1...).

- Carefully read the Text/Notes on the drawing. If the drawing includes notes on mix design, concrete grade, brick type, steel dimensions, etc., it is MANDATORY to include them in the work item name ("item_name") or explanation ("explanation"). For example: "Concrete footing with 1x2 stone aggregate M250".

3. EXTRACT THE CORRECT DIMENSIONS: Only extract the exact Quantity of Components (quantity_factor), Length, Width, and Height. For dimensions that are missing or cannot be deduced, leave them as 0.
4. ABSOLUTELY NO CALCULATIONS IN JSON: The length, width, height, and quantity_factor fields MUST ONLY BE SINGLE NUMBERS (e.g., write 106.2 instead of 46.00 + 60.20). If you need to calculate the total, do it mentally and print the final result.

5. CLEAR HIERARCHICAL STRUCTURE: Group tasks into the correct parent categories (e.g., "FOUNDATION", "SUBSTRATE", "FINISHING").

Return ONLY a JSON array with the following structure (without any other Markdown text):
[
  {
    "section_name": "I. PHẦN MÓNG",
    "items": [
      {
        "item_name": "Bê tông lót móng đá 4x6 M100",
        "norm_code": null,
        "unit": "m3",
        "details": [
          { "explanation": "Lót đài móng M1", "quantity_factor": 13, "length": 1.55, "width": 1.35, "height": 0.1 },
          { "explanation": "Lót đài móng M2", "quantity_factor": 4, "length": 2.10, "width": 1.80, "height": 0.1 }
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