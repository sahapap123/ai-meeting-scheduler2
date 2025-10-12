// app/api/analyze/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing 'text'" }, { status: 400 });
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // เปลี่ยนรุ่นได้ตามที่ใช้
        temperature: 0.3,
        messages: [
          { role: "system", content: "คุณคือผู้ช่วยภาษาไทย สรุปและวิเคราะห์ให้กระชับและเข้าใจง่าย" },
          { role: "user", content: `วิเคราะห์และสรุปประเด็นสำคัญจากข้อความนี้:\n\n${text}` },
        ],
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      return NextResponse.json({ error: "upstream_error", detail: err }, { status: 502 });
    }

    const data = await r.json();
    const result = data?.choices?.[0]?.message?.content ?? "ไม่ได้รับผลลัพธ์จากโมเดล";
    return NextResponse.json({ result });
  } catch (e: any) {
    return NextResponse.json({ error: "server_error", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
