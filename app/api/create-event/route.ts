// app/api/create-event/route.ts
import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session || !session.accessToken) return new Response("กรุณาล็อกอินใหม่ (Token หาย)", { status: 401 });

  try {
    const { prompt } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const aiPrompt = `Extract event from: "${prompt}". Current time: ${new Date().toISOString()}. 
    Return ONLY JSON: {"summary": "Title with emoji", "start": "ISO string", "end": "ISO string"}`;

    const result = await model.generateContent(aiPrompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const eventDetails = JSON.parse(text);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: eventDetails.summary,
        start: { dateTime: eventDetails.start },
        end: { dateTime: eventDetails.end },
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response("AI หรือ Google ขัดข้อง: " + error.message, { status: 500 });
  }
}