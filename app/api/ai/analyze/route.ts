import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, systemPrompt, useSearch } = body;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: "Thiếu GEMINI_API_KEY trong file .env" }, { status: 500 });
        }

        // Khuyên dùng gemini-1.5-pro vì nó hỗ trợ công cụ Google Search (Grounding) cực kỳ ổn định
        const modelName = 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        // Cấu hình payload
        const payload: any = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt || "Bạn là Chuyên gia Quản lý Dự án Xây dựng (PM)." }] }
        };

        // Kích hoạt tính năng Google Search nếu Frontend yêu cầu
        if (useSearch) {
            payload.tools = [{ googleSearch: {} }];
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google API Error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return NextResponse.json({ success: true, text: textResult });

    } catch (error: any) {
        console.error("Lỗi tại /api/ai/analyze:", error.message);
        return NextResponse.json({ success: false, error: "Lỗi máy chủ nội bộ khi phân tích AI." }, { status: 500 });
    }
}