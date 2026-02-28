import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text } = body;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: "Thiếu GEMINI_API_KEY trong file .env" }, { status: 500 });
        }

        // Sử dụng endpoint TTS thử nghiệm mà sếp cung cấp
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: `Say clearly in a professional Vietnamese female voice: ${text}` }] }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`TTS API Error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!audioBase64) {
            throw new Error("Không nhận được dữ liệu âm thanh từ Google.");
        }

        return NextResponse.json({ success: true, audioData: audioBase64 });

    } catch (error: any) {
        console.error("Lỗi tại /api/ai/tts:", error.message);
        return NextResponse.json({ success: false, error: "Không thể tạo giọng nói AI lúc này." }, { status: 500 });
    }
}