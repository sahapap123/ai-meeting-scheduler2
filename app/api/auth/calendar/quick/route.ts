// app/api/auth/calendar/quick/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/route";
import { GoogleCalendar } from "@/lib/google-calendar";
import OpenAI from "openai";

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

  // ถ้าวันนั้นในเดือนนี้ผ่านไปแล้ว → ขยับไปเดือนถัดไป
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
  title: string;   // ชื่ออีเวนต์
  date: string;    // YYYY-MM-DD (ตามเวลาไทย)
  start: string;   // HH:mm (24 ชม., ตามเวลาไทย)
  end?: string;    // HH:mm
};

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // วันที่อ้างอิงฝั่งไทย (ไม่ใช้ไลบรารี แปลงด้วย locale)
    const nowThai = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const todayStr = [
      nowThai.getFullYear(),
      String(nowThai.getMonth() + 1).padStart(2, "0"),
      String(nowThai.getDate()).padStart(2, "0"),
    ].join("-");

    const system = `
คุณเป็นตัวแปลงภาษาธรรมชาติของคนไทยให้เป็นเวลา
กติกา:
- ตัวอย่าง: "วันนี้สองทุ่ม", "พรุ่งนี้บ่ายสองถึงบ่ายสาม", "เที่ยงคืน", "หกโมงเย็น", "หนึ่งทุ่มครึ่ง", "วันที่ 13 10 โมงเช้า"
- ตีความภาษาพูดไทย:
  • 1 ทุ่ม=19:00, 2 ทุ่ม=20:00, 3 ทุ่ม=21:00, 4 ทุ่ม=22:00, 5 ทุ่ม=23:00, 6 ทุ่ม=00:00 (วันถัดไป)
  • "ครึ่ง"=+30 นาที, "เที่ยง"=12:00, "เที่ยงคืน"=00:00
  • รองรับเลขไทย (๑๒๓๔) และคำว่า "วันที่ X"
- ถ้าไม่ระบุเวลาเสร็จ ให้ตั้งระยะ 60 นาที
- อ้างอิงวันที่ฝั่งไทย (Asia/Bangkok) วันนี้ = ${todayStr}
- ให้เรียกใช้ฟังก์ชัน set_event เพียงครั้งเดียว พร้อมอาร์กิวเมนต์เป็น JSON ตามสคีมา
`.trim();

    // ใช้ Chat Completions + Function Calling เพื่อให้ได้ JSON ที่ชัวร์
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `ข้อความ: ${text}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "set_event",
            description: "คืนค่าอีเวนต์เดียวตามเวลาไทย",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "ชื่ออีเวนต์" },
                date:  { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "วันที่แบบ YYYY-MM-DD (เวลาไทย)" },
                start: { type: "string", pattern: "^\\d{2}:\\d{2}$", description: "เวลาเริ่ม HH:mm (24 ชม., เวลาไทย)" },
                end:   { type: "string", pattern: "^\\d{2}:\\d{2}$", description: "เวลาจบ HH:mm (ถ้าไม่ระบุ ให้เว้นไว้)" }
              },
              required: ["title", "date", "start"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "set_event" } }
    });

    const choice = completion.choices[0];
    let parsed: AiResult;

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
      const args = choice.message.tool_calls[0].function.arguments;
      parsed = JSON.parse(args) as AiResult;
    } else {
      parsed = JSON.parse(choice.message.content ?? "{}") as AiResult;
    }

    if (!parsed?.date || !parsed?.start) {
      return NextResponse.json({ error: "Missing date/start from AI", raw: parsed }, { status: 400 });
    }

    // บังคับวันให้ตรงกับ "วันที่ X" ถ้าผู้ใช้ระบุ
    const forced = coerceDateFromThaiText(text, nowThai);
    if (forced) parsed.date = forced;

    console.log("AI parsed ->", parsed);

    const gc = new GoogleCalendar(session.accessToken);
    const event = await gc.createEvent({
      summary: parsed.title || text,
      date: parsed.date,
      start: parsed.start,
      end: parsed.end, // ไม่มีก็ปล่อยให้ lib เติม +60 นาที
    });

    return NextResponse.json({ ok: true, event, ai: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
