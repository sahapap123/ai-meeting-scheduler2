// app/api/create-event/route.ts
import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session || !session.accessToken) return new Response("Unauthorized", { status: 401 });

  try {
    const { prompt } = await req.json();
    // เปลี่ยนมาใช้โมเดล gemini-1.5-flash ที่เสถียรกว่า
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const aiPrompt = `คุณคือผู้ช่วยจัดการตารางเวลา ให้ข้อมูลจากข้อความ: "${prompt}". 
    เวลาปัจจุบัน: ${new Date().toISOString()}. 
    ตอบกลับเป็น JSON เท่านั้น ห้ามมีคำอธิบาย: {"summary": "ชื่อนัดหมาย+อีโมจิ", "start": "ISO String", "end": "ISO String"}`;

    const result = await model.generateContent(aiPrompt);
    const responseText = result.response.text();
    
    // ล้างเครื่องหมาย ```json ออกก่อนนำไปใช้
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const eventDetails = JSON.parse(cleanJson);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: eventDetails.summary,
        start: { dateTime: eventDetails.start, timeZone: 'Asia/Bangkok' },
        end: { dateTime: eventDetails.end, timeZone: 'Asia/Bangkok' },
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    // ส่ง Error ออกไปให้ Alert เห็นชัดๆ
    return new Response("AI หรือ Google ขัดข้อง: " + error.message, { status: 500 });
  }
}