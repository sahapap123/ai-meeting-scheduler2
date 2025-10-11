// app/api/auth/calendar/quick/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/route";
import { GoogleCalendar } from "@/lib/google-calendar";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type AiResult = {
  title: string;
  date: string;   // YYYY-MM-DD (ตามเวลาไทย)
  start: string;  // HH:mm (24 ชม. ตามเวลาไทย)
  end?: string;   // HH:mm
};

// ————— helpers: ตัวแปลงเลขไทย → อารบิก —————
const TH2AR: Record<string, string> = {
  "๐":"0","๑":"1","๒":"2","๓":"3","๔":"4","๕":"5","๖":"6","๗":"7","๘":"8","๙":"9"
};
function normDigits(s: string) {
  return s.replace(/[๐-๙]/g, ch => TH2AR[ch] ?? ch).trim();
}

// ————— บังคับวัน “วันที่ X” ให้ตรงแน่นอน (เลื่อนไปเดือนถัดไปถ้าผ่านแล้ว) —————
function coerceDateFromThaiText(input: string, nowThai: Date): string | null {
  const norm = normDigits(input);
  const m = norm.match(/วันที่\s*(\d{1,2})/);
  if (!m) return null;
  const day = Math.min(31, Math.max(1, parseInt(m[1], 10)));

  const y = nowThai.getFullYear();
  const mon = nowThai.getMonth();
  let cand = new Date(y, mon, day);
  const todayMid = new Date(y, mon, nowThai.getDate());
  if (cand < todayMid) cand = new Date(y, mon + 1, day);

  const yy = cand.getFullYear();
  const mm = String(cand.getMonth() + 1).padStart(2, "0");
  const dd = String(cand.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// ————— rule-based parser (fallback เมื่อ AI ไม่ให้ JSON) —————
function thaiQuickParse(inputRaw: string, nowThai: Date): AiResult | null {
  const s = normDigits(inputRaw);

  // 1) date
  let dateStr: string;
  if (/วันนี้/.test(s)) {
    dateStr = fmtDate(nowThai);
  } else if (/พรุ่งนี้/.test(s)) {
    const d = new Date(nowThai); d.setDate(d.getDate() + 1);
    dateStr = fmtDate(d);
  } else if (/มะรืน/.test(s)) {
    const d = new Date(nowThai); d.setDate(d.getDate() + 2);
    dateStr = fmtDate(d);
  } else {
    const forced = coerceDateFromThaiText(s, nowThai);
    dateStr = forced ?? fmtDate(nowThai);
  }

  // 2) time (รองรับ: ทุ่ม/โมงเช้า/โมงเย็น/บ่าย/เที่ยง/เที่ยงคืน และ “ถึง”)
  let start: string | null = null;
  let end: string | null = null;

  // split range: “...ถึง...”
  const parts = s.split(/ถึง/);
  const startText = parts[0];
  const endText = parts[1];

  start = parseThaiTime(startText);
  if (endText) end = parseThaiTime(endText);

  if (!start) return null;

  return {
    title: inputRaw,
    date: dateStr,
    start,
    end: end ?? addMinutes(start, 60),
  };
}

function fmtDate(d: Date) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function addMinutes(hhmm: string, mins: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  d.setMinutes(d.getMinutes() + mins);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function parseThaiTime(t: string): string | null {
  const x = t.replace(/\s+/g, "");
  // เที่ยง / เที่ยงคืน
  if (/เที่ยงคืน/.test(x)) return "00:00";
  if (/เที่ยง/.test(x))    return "12:00";

  // N ทุ่ม (ครึ่ง)
  {
    const m = x.match(/(\d{1,2})ทุ่ม(ครึ่ง)?/);
    if (m) {
      let n = parseInt(m[1], 10);
      n = Math.max(1, Math.min(6, n)); // 1–6 ทุ่ม
      let h = 18 + n;                   // 1 ทุ่ม = 19:00
      if (h >= 24) h = 0;               // 6 ทุ่ม = 24:00 → 00:00 (วันถัดไปไม่รองรับใน quick)
      const mm = m[2] ? 30 : 0;
      return `${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
    }
  }

  // บ่าย [โมง|N(โมง)?] (ครึ่ง)
  {
    // บ่ายโมง / บ่ายสอง(ครึ่ง) ...
    const m = x.match(/บ่าย(?:(โมง)|(\\d{1,2})(?:โมง)?)(ครึ่ง)?/);
    if (m) {
      let h = 13; // บ่ายโมง
      if (m[2]) {
        const n = Math.max(1, Math.min(11, parseInt(m[2], 10)));
        h = 12 + n; // บ่ายสอง=14, บ่ายสาม=15, ...
      }
      const mm = m[3] ? 30 : 0;
      return `${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
    }
  }

  // N โมงเช้า / N โมงเย็น / N โมง (เช้าถ้าไม่ระบุ)
  {
    const m = x.match(/(\d{1,2})โมง(เช้า|เย็น)?(ครึ่ง)?/);
    if (m) {
      let n = Math.max(1, Math.min(12, parseInt(m[1], 10)));
      let h = n;
      if (m[2] === "เย็น") h = 12 + n; // สี่โมงเย็น=16, ห้าโมงเย็น=17, หกโมงเย็น=18
      const mm = m[3] ? 30 : 0;
      // ถ้าไม่ระบุเช้า/เย็นและ n<=11 → ถือเป็นเช้า
      if (!m[2]) h = n === 12 ? 12 : n;
      return `${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
    }
  }

  // 24 ชม. เช่น 20:30 / 9:00น.
  {
    const m = x.match(/(\d{1,2})[:.](\d{1,2})/);
    if (m) {
      const h = Math.max(0, Math.min(23, parseInt(m[1], 10)));
      const mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
      return `${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // เวลาอ้างอิงฝั่งไทย (เพื่อคำว่า วันนี้/พรุ่งนี้)
    const nowThai = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const todayStr = fmtDate(nowThai);

    // ——— 1) ขอ AI ก่อน (function calling) ———
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

    let parsed: AiResult | null = null;

    try {
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
                  title: { type: "string" },
                  date:  { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                  start: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
                  end:   { type: "string", pattern: "^\\d{2}:\\d{2}$" }
                },
                required: ["title", "date", "start"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "set_event" } }
      });

      const choice = completion.choices[0];
      if (choice.message.tool_calls?.length) {
        const args = choice.message.tool_calls[0].function.arguments;
        parsed = JSON.parse(args) as AiResult;
      } else if (choice.message.content) {
        // เผื่อบางรุ่นส่งเป็นข้อความ JSON
        parsed = JSON.parse(choice.message.content) as AiResult;
      }
    } catch (e) {
      // ล้มเหลวก็ไป fallback ต่อ
      parsed = null;
    }

    // ——— 2) ถ้า AI ไม่ให้ date/start → ใช้ rule-based fallback ———
    if (!parsed?.date || !parsed?.start) {
      parsed = thaiQuickParse(text, nowThai);
    }

    // ——— 3) ถ้ายังไม่มี → ยอมแพ้ พร้อม debug กลับไปหน้าบ้าน ———
    if (!parsed?.date || !parsed?.start) {
      return NextResponse.json({ error: "Missing date/start from AI" }, { status: 400 });
    }

    // บังคับวันให้ตรงกับ “วันที่ X” อีกชั้น (กันคลาดเคลื่อน)
    const forced = coerceDateFromThaiText(text, nowThai);
    if (forced) parsed.date = forced;

    // ——— 4) สร้างอีเวนต์ใน Google Calendar (lib จะสร้าง RFC3339 +07:00 ให้เอง) ———
    const gc = new GoogleCalendar(session.accessToken);
    const event = await gc.createEvent({
      summary: parsed.title || text,
      date: parsed.date,
      start: parsed.start,
      end: parsed.end, // ไม่มีก็จะ default +60 นาทีใน lib
    });

    return NextResponse.json({ ok: true, event, ai: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
