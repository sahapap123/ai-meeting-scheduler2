// app/api/create-event/route.ts
import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) return new Response("Unauthorized", { status: 401 });

  const { prompt } = await req.json();

  // --- ขั้นตอนที่ 1: ให้ AI (Gemini) วิเคราะห์ข้อความ ---
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const aiPrompt = `
    Extract event details from this Thai text: "${prompt}".
    Current time is ${new Date().toLocaleString('th-TH')}.
    Return ONLY a JSON object with: 
    { "summary": "Title with emoji", "start": "ISO DateTime", "end": "ISO DateTime" }.
    If duration is not specified, make it 1 hour.
  `;

  const result = await model.generateContent(aiPrompt);
  const eventDetails = JSON.parse(result.response.text().replace(/```json|```/g, ""));

  // --- ขั้นตอนที่ 2: ส่งข้อมูลเข้า Google Calendar ---
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: eventDetails.summary,
        start: { dateTime: eventDetails.start, timeZone: 'Asia/Bangkok' },
        end: { dateTime: eventDetails.end, timeZone: 'Asia/Bangkok' },
      },
    });
    return new Response(JSON.stringify(response.data), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Calendar Error" }), { status: 500 });
  }
}