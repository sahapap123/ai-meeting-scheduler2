// app/api/auth/calendar/smart_query.ts/route.ts
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

    const parsed = parseThaiTime(text);
    const gc = new GoogleCalendar(session.accessToken);

    let event;
    if (parsed.start && parsed.end) {
      event = await gc.createEvent({
        summary: parsed.summary || text,
        start: parsed.start,
        end: parsed.end,
        timeZone: "Asia/Bangkok",
      });
    } else {
      // fallback เฉพาะกรณี parse ไม่ได้เลย
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
