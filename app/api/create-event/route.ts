// app/api/create-event/route.ts
import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return new Response("Unauthorized", { status: 401 });

  try {
    const { prompt } = await req.json();
    // ใช้ชื่อโมเดลแบบเจาะจงเพื่อกัน 404
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    const aiPrompt = `Extract event data from: "${prompt}". Current: ${new Date().toISOString()}. 
    Return ONLY JSON: {"summary":"Title+Emoji","start":"ISO","end":"ISO"}`;

    const result = await model.generateContent(aiPrompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const event = JSON.parse(cleanJson);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        start: { dateTime: event.start },
        end: { dateTime: event.end },
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response("Error: " + error.message, { status: 500 });
  }
}