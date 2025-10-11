// app/api/auth/calendar/quick/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/route";
import { GoogleCalendar } from "@/lib/google-calendar";
import OpenAI from "openai";
import * as tz from "date-fns-tz";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AiResult = {
  title: string;           // ชื่ออีเวนต์
  date: string;            // YYYY-MM-DD (โซนเวลาไทย)
  start: string;           // HH:mm (24 ชม., โซนเวลาไทย)
  end?: string;            // HH:mm (ถ้าไม่ให้ จะ default 60 นาทีด้านล่าง)
};

function makeLocalDate(date: string, hhmm: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  // สร้างเป็นเวลา "ตามนาฬิกาไทย" ก่อน แล้วค่อยแปลงเป็น UTC ตอน createEvent
  return new Date(y, (m - 1), d, hh, mm, 0, 0);
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // วันที่อ้างอิงฝั่งไทย (เพื่อให้โมเดลคำนวณ "วันนี้/พรุ่งนี้/คืนนี้" ได้ตรง)
    const now = new Date();
    const nowInBangkok = tz.utcToZonedTime(now, "Asia/Bangkok");
    const todayStr = [
      nowInBangkok.getFullYear(),
      String(nowInBangkok.getMonth() + 1).padStart(2, "0"),
      String(nowInBangkok.getDate()).padStart(2, "0"),
    ].join("-");

    // ขอให้โมเดลคืน JSON ที่แน่นอน
    const system = `
คุณเป็นตัวแปลงภาษาธรรมชาติของคนไทยให้เป็นเวลา.
กติกา:
- รับข้อความสั้น ๆ เช่น "วันนี้สองทุ่ม", "พรุ่งนี้บ่ายสองถึงบ่ายสาม", "เที่ยงคืน", "หกโมงเย็น", "หนึ่งทุ่มครึ่ง"
- ให้ตีความตามภาษาพูดไทย:
  • 1 ทุ่ม = 19:00, 2 ทุ่ม = 20:00, ... , 5 ทุ่ม = 23:00, 6 ทุ่ม = 24:00/00:00 (วันถัดไป)
  • เช้า 6–11 โมง, เย็น 17–18 โมง, บ่าย 13–16 นาฬิกา
  • "ครึ่ง" = +30 นาที
  • "เที่ยง" = 12:00, "เที่ยงคืน" = 00:00
- รองรับตัวเลขไทยและคำไทย (เช่น สองทุ่ม, ๒ทุ่ม)
- ถ้าไม่ระบุเวลาเสร็จ ให้กำหนดความยาว 60 นาที
- ให้คำนวณจากวันที่อ้างอิงฝั่งไทย (Asia/Bangkok) วันนี้ = ${todayStr}
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
      return NextResponse.json(
        { error: "AI parsing failed", raw },
        { status: 400 }
      );
    }

    if (!parsed?.date || !parsed?.start) {
      return NextResponse.json({ error: "Missing date/start from AI" }, { status: 400 });
    }

    const startLocal = makeLocalDate(parsed.date, parsed.start);
    const endLocal = parsed.end
      ? makeLocalDate(parsed.date, parsed.end)
      : new Date(startLocal.getTime() + 60 * 60 * 1000);

   const gc = new GoogleCalendar(session.accessToken);
const event = await gc.createEvent({
  summary: parsed.title || text,
  date: parsed.date,        // "YYYY-MM-DD" จาก AI
  start: parsed.start,      // "HH:mm"
  end: parsed.end,          // ถ้าไม่มีจะ default 60 นาทีใน lib
  timeZone: "Asia/Bangkok",
});

    return NextResponse.json({ ok: true, event, ai: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
