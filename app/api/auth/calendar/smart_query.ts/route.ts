// app/api/auth/calendar/smart_query.ts/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/route";
import { createGoogleCalendar } from "@/lib/google-calendar";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const googleCalendar = createGoogleCalendar(session.accessToken);
    const event = await googleCalendar.quickAddEvent(text);

    return NextResponse.json({ ok: true, event });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
