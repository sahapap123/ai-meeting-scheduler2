// app/api/auth/calendar/smart_query/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GoogleCalendar } from "@/lib/google-calendar";

export const runtime = "nodejs";

// ——— helpers: เวลาไทย ———
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const thaiNow = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

const rfcMin = (ymdStr: string) => `${ymdStr}T00:00:00+07:00`;
const rfcMax = (ymdStr: string) => `${ymdStr}T23:59:59+07:00`;

function startEndToday(nowTH = thaiNow()) {
  const d = new Date(nowTH);
  const s = ymd(d);
  return { startRFC: rfcMin(s), endRFC: rfcMax(s), label: `วันนี้ (${s})` };
}
function startEndTomorrow(nowTH = thaiNow()) {
  const d = new Date(nowTH);
  d.setDate(d.getDate() + 1);
  const s = ymd(d);
  return { startRFC: rfcMin(s), endRFC: rfcMax(s), label: `พรุ่งนี้ (${s})` };
}
function startEndThisWeek(nowTH = thaiNow()) {
  const d = new Date(nowTH);
  // สัปดาห์เริ่มวันจันทร์
  const day = (d.getDay() + 6) % 7; // 0=จันทร์ … 6=อาทิตย์
  const start = new Date(d); start.setDate(start.getDate() - day);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const s = ymd(start); const e = ymd(end);
  return { startRFC: rfcMin(s), endRFC: rfcMax(e), label: `สัปดาห์นี้ (${s}–${e})` };
}
function startEndThisMonth(nowTH = thaiNow()) {
  const d = new Date(nowTH);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const s = ymd(start); const e = ymd(end);
  return { startRFC: rfcMin(s), endRFC: rfcMax(e), label: `เดือนนี้ (${s}–${e})` };
}

function norm(s: string) {
  const th2ar: Record<string, string> = {"๐":"0","๑":"1","๒":"2","๓":"3","๔":"4","๕":"5","๖":"6","๗":"7","๘":"8","๙":"9"};
  return s.replace(/[๐-๙]/g, ch => th2ar[ch] ?? ch).toLowerCase().trim();
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = norm(text || "");
    const gc = new GoogleCalendar(session.accessToken);

    // ——— เข้าใจ intent แบบ rule-based: วันนี้ / พรุ่งนี้ / สัปดาห์นี้ / เดือนนี้ / วันไหนบ้าง ———
    let range:
      | { startRFC: string; endRFC: string; label: string }
      | null = null;

    if (/พรุ่งนี้/.test(q))       range = startEndTomorrow();
    else if (/วันนี้/.test(q))    range = startEndToday();
    else if (/สัปดาห์นี้/.test(q)) range = startEndThisWeek();
    else if (/เดือนนี้/.test(q))   range = startEndThisMonth();

    // “มีประชุมวันไหนบ้าง” → ดู 14 วันข้างหน้า
    const askWhichDays = /วันไหนบ้าง|วันไหนบ้างคะ|วันไหนบ้างครับ/.test(q);

    if (askWhichDays) {
      const nowTH = thaiNow();
      const days: string[] = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(nowTH);
        d.setDate(d.getDate() + i);
        const s = ymd(d);
        const items = await gc.listEvents({
          timeMin: rfcMin(s),
          timeMax: rfcMax(s),
          maxResults: 5,
        });
        if (items.length) days.push(s);
      }
      const msg =
        days.length
          ? `มีประชุมในวัน: ${days.join(", ")}`
          : "ไม่มีประชุมใน 14 วันข้างหน้า";
      return NextResponse.json({ ok: true, text_response: msg });
    }

    // default: ถามว่า “มีประชุมไหม วันนี้/พรุ่งนี้/สัปดาห์นี้/เดือนนี้”
    if (!range) {
      // ถ้าไม่ได้ระบุช่วงใด ๆ ให้ตีความเป็น “วันนี้”
      range = startEndToday();
    }

    const items = await gc.listEvents({
      timeMin: range.startRFC,
      timeMax: range.endRFC,
      maxResults: 50,
    });

    if (!items.length) {
      return NextResponse.json({
        ok: true,
        text_response: `ช่วง ${range.label} ไม่มีประชุม`,
      });
    }

    // สรุปรายการสั้น ๆ
    const lines = items.map((ev: any) => {
      const start = ev.start?.dateTime || ev.start?.date;
      const end   = ev.end?.dateTime   || ev.end?.date;
      const title = ev.summary || "(ไม่มีชื่อ)";
      return `• ${title} — ${start?.slice(0,16)} → ${end?.slice(0,16)}`;
    });

    return NextResponse.json({
      ok: true,
      text_response: `ช่วง ${range.label} มี ${items.length} รายการ:\n` + lines.join("\n"),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
