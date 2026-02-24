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
    // แก้ไขชื่อโมเดลเป็น gemini-1.5-flash-latest เพื่อป้องกัน Error 404
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    const aiPrompt = `Extract event data from: "${prompt}". Return ONLY JSON: {"summary":"Title+Emoji","start":"ISO String","end":"ISO String"}`;

    const result = await model.generateContent(aiPrompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const eventData = JSON.parse(cleanJson);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: eventData.summary,
        start: { dateTime: eventData.start },
        end: { dateTime: eventData.end },
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response("AI Error: " + error.message, { status: 500 });
  }
}