// app/api/analyze/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // ป้องกัน parse ว่าง
    let textInput = "";
    try {
      const body = await req.json();
      textInput = body?.text;
    } catch {
      /* ignore */
    }
    if (!textInput || typeof textInput !== "string") {
      return NextResponse.json({ error: "Missing 'text'" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "no_api_key" }, { status: 500 });
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: "คุณคือผู้ช่วยภาษาไทย สรุปและวิเคราะห์ให้กระชับและเข้าใจง่าย" },
          { role: "user", content: `วิเคราะห์และสรุปประเด็นสำคัญจากข้อความนี้:\n\n${textInput}` },
        ],
      }),
    });

    const raw = await resp.text(); // อ่านเป็น text ก่อนเสมอ
    if (!resp.ok) {
      return NextResponse.json({ error: "upstream_error", detail: raw }, { status: 502 });
    }

    let data: any;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      return NextResponse.json({ error: "invalid_upstream_json", detail: raw?.slice(0, 2000) }, { status: 502 });
    }

    const result = data?.choices?.[0]?.message?.content ?? "ไม่ได้รับผลลัพธ์จากโมเดล";
    return NextResponse.json({ result });
  } catch (e: any) {
    return NextResponse.json({ error: "server_error", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
