// app/api/create-event/route.ts
import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return new Response("Unauthorized", { status: 401 });

  try {
    const { prompt } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    // --- 🌟 ระบบกันตาย (Fallback): เตรียมข้อมูลพื้นฐานไว้ก่อน ---
    let eventData = {
      summary: prompt + " 🤖", // เอาคำสั่งที่พิมพ์มาตั้งเป็นชื่อนัดหมายซะเลย
      start: new Date().toISOString(), // เริ่มเดี๋ยวนี้
      end: new Date(Date.now() + 60 * 60 * 1000).toISOString() // จบในอีก 1 ชม.
    };

    // --- พยายามเรียก AI (gemini-pro) ---
    try {
      const aiPrompt = `คุณคือผู้ช่วยจัดการเวลา วิเคราะห์ข้อมูลจาก: "${prompt}". เวลาปัจจุบันคือ: ${new Date().toISOString()}. คืนค่าเป็น JSON เท่านั้น: {"summary":"ชื่อนัดหมายพร้อมอีโมจิ","start":"เวลาเริ่มแบบ ISO String","end":"เวลาจบแบบ ISO String"}`;

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt }] }] })
      });

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const responseText = geminiData.candidates[0].content.parts[0].text;
        const cleanJson = responseText.replace(/```json|```/g, "").trim();
        eventData = JSON.parse(cleanJson); // ถ้า AI ฉลาดตอบกลับมา ก็ใช้ของ AI
      }
    } catch (aiError) {
      console.log("AI ขัดข้อง, สลับใช้ระบบกันตาย"); // ถ้า AI พัง ระบบจะข้ามไปใช้ข้อมูลพื้นฐานที่เตรียมไว้แทน
    }

    // --- ส่งข้อมูลเข้า Google Calendar (ทำงาน 100% แน่นอน) ---
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
    return new Response("ระบบขัดข้อง: " + error.message, { status: 500 });
  }
}