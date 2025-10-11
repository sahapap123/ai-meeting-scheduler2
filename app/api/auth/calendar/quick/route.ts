// app/api/auth/calendar/quick/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/route";
import { GoogleCalendar } from "@/lib/google-calendar";
import OpenAI from "openai";
import * as tz from "date-fns-tz";

export const runtime = "nodejs";

// บังคับให้วันที่ตรงกับเลขที่ผู้ใช้พิมพ์ ("วันที่ 13", รองรับเลขไทยด้วย)
function coerceDateFromThaiText(input: string, currentInThai: Date): string | null {
  const th2ar: Record<string,string> = {"๐":"0","๑":"1","๒":"2","๓":"3","๔":"4","๕":"5","๖":"6","๗":"7","๘":"8","๙":"9"};
  const norm = input.replace(/[๐-๙]/g, ch => th2ar[ch] ?? ch);
  const m = norm.match(/วันที่\s*(\d{1,2})/);
  if (!m) return null;

  const day = Math.min(31, Math.max(1, parseInt(m[1], 10)));
  const y = currentInThai.getFullYear();
  const mon = currentInThai.getMonth();

  // เข้าใจตามคนไทย: ถ้าวันที่นั้นใน "เดือนนี้" ผ่านไปแล้ว → ขยับไปเดือนถัดไป
  let cand = new Date(y, mon, day);
  const todayMid = new Date(y, mon, currentInThai.getDate());
  if (cand < todayMid) cand = new Date(y, mon + 1, day);

  const yy = cand.getFullYear();
  const mm = String(cand.getMonth() + 1).padStart(2, "0");
  const dd = String(cand.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type AiResult = {
  title: string;
  date: string;   // YYYY-MM-DD (ตามเวลาไทย)
  start: string;  // HH:mm (24 ชม. ตามเวลาไทย)
  end?: string;   // HH:mm
};

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // วันที่อ้างอิงฝั่งไทย เพื่อให้ AI เข้าใจคำว่า "วันนี้/พรุ่งนี้"
    const now = new Date();
    const nowInBangkok = tz.utcToZonedTime(now, "Asia/Bangkok");
    const todayStr = [
      nowInBangkok.getFullYear(),
      String(nowInBangkok.getMonth() + 1).padStart(2, "0"),
      String(nowInBangkok.getDate()).padStart(2, "0"),
    ].join("-");

    const system = `
คุณเป็นตัวแปลงภาษาธรรมชาติของคนไทยให้เป็นเวลา
กติกา:
- ตัวอย่าง: "วันนี้สองทุ่ม", "พรุ่งนี้บ่ายสองถึงบ่ายสาม", "เที่ยงคืน", "หกโมงเย็น", "หนึ่งทุ่มครึ่ง", "วันที่ 13 10 โมงเช้า"
- ตีความภาษาพูดไทย:
  • 1 ทุ่ม=19:00, 2 ทุ่ม=20:00, 3 ทุ่ม=21:00, 4 ทุ่ม=22:00, 5 ทุ่ม=23:00, 6 ทุ่ม=00:00 (วันถัดไป)
  • "ครึ่ง" = +30 นาที, "เที่ยง"=12:00, "เที่ยงคืน"=00:00
  • รองรับเลขไทย (๑๒๓๔) และคำว่า "วันที่ X"
- ถ้าไม่ระบุเวลาเสร็จ ให้ตั้งระยะ 60 นาที
- อ้างอิงวันที่ฝั่งไทย (Asia/Bangkok) วันนี้ = ${todayStr}
- ตอบกลับเป็น JSON เดียวเท่านั้น (ห้ามมีข้อความอื่น)
รูปแบบ JSON:
{ "title": string, "date": "YYYY-MM-DD", "start": "HH:mm", "end": "HH:mm" }
`.trim();

    const user = `ข้อความ: ${text}`;
    const resp = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `${system}\n\n${user}`,
    });

    const raw = resp.output_text?.trim() || "{}";
    let parsed: AiResult;
    try {
      parsed = JSON.parse(raw) as AiResult;
    } catch {
      return NextResponse.json({ error: "AI parsing failed", raw }, { status: 400 });
    }
    if (!parsed?.date || !parsed?.start) {
      return NextResponse.json({ error: "Missing date/start from AI", raw }, { status: 400 });
    }

    // ⚙️ บังคับให้วันตรงกับเลขที่ผู้ใช้พิมพ์ ("วันที่ X") ถ้ามี
    const nowThai = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const forced = coerceDateFromThaiText(text, nowThai);
    if (forced) parsed.date = forced;

    // (Debug) ดูค่าที่ AI คืนมาและวันที่ที่บังคับแล้ว
    console.log("AI parsed ->", parsed);

    const gc = new GoogleCalendar(session.accessToken);
    const event = await gc.createEvent({
      summary: parsed.title || text,
      date: parsed.date,
      start: parsed.start,
      end: parsed.end, // ไม่มีได้ จะ default +60 นาที
    });

    return NextResponse.json({ ok: true, event, ai: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
