// app/api/auth/calendar/smart_query/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/route";
import { GoogleCalendar } from "@/lib/google-calendar";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { text } = await req.json();
        if (!text) {
            return new NextResponse(JSON.stringify({ error: "Missing text in request body" }), { status: 400 });
        }

        const googleCalendar = new GoogleCalendar(session);
        
        // For simplicity, we are now only using the quickAddEvent feature.
        const event = await googleCalendar.quickAddEvent(text);
        
        return NextResponse.json({ ok: true, event });

    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("API Route Error:", error);
        return new NextResponse(JSON.stringify({ error: "Failed to process request" }), { status: 500 });
    }
}