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
    
    // คำสั่ง Prompt
    const aiPrompt = `คุณคือผู้ช่วยจัดการเวลา วิเคราะห์ข้อมูลจาก: "${prompt}". เวลาปัจจุบันคือ: ${new Date().toISOString()}. คืนค่าเป็น JSON เท่านั้น: {"summary":"ชื่อนัดหมายพร้อมอีโมจิ","start":"เวลาเริ่มแบบ ISO String","end":"เวลาจบแบบ ISO String (บวก 1 ชม.ถ้าไม่ระบุ)"}`;

    // ยิงตรงไปหาเซิร์ฟเวอร์ Gemini แบบไม่ผ่าน Library! (แก้บั๊ก 404 เด็ดขาด)
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: aiPrompt }] }]
      })
    });

    const geminiData = await geminiRes.json();
    
    if (!geminiRes.ok) {
      throw new Error(geminiData.error?.message || "เชื่อมต่อ Gemini ไม่ได้");
    }

    // แกะข้อความ JSON ออกมา
    const responseText = geminiData.candidates[0].content.parts[0].text;
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const eventData = JSON.parse(cleanJson);

    // ส่งเข้าปฏิทิน Google
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