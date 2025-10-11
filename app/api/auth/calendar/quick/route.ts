// app/api/auth/calendar/quick/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/route";
import { GoogleCalendar } from "@/lib/google-calendar";
import { parseThaiTime } from "@/lib/nlp-thai-time";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gc = new GoogleCalendar(session.accessToken);

    // 1) แปลงประโยคไทย → ช่วงเวลา
    const parsed = parseThaiTime(text);
    let event;

    if (parsed.start && parsed.end && parsed.confidence >= 0.6) {
      // 2) ถ้ามั่นใจพอ → สร้างอีเวนต์แบบระบุเวลาแน่นอน
      event = await gc.createEvent({
        summary: parsed.summary || text,
        start: parsed.start,
        end: parsed.end,
        timeZone: "Asia/Bangkok",
      });
    } else {
      // 3) ถ้าไม่มั่นใจ → fallback ไป quickAdd ของ Google
      event = await gc.quickAddEvent(text);
    }

    return NextResponse.json({ ok: true, event });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
