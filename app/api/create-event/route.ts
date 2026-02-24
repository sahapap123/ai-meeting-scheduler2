// app/api/create-event/route.ts
import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// --- ฟังก์ชันสมองกล (Fake AI Logic) ---
function extractEventData(text: string) {
  const now = new Date();
  let targetDate = new Date(now);
  let summary = text; // ใช้ข้อความเดิมเป็นชื่อนัดหมายไปก่อน

  // 1. เช็ควัน: "พรุ่งนี้"
  if (text.includes("พรุ่งนี้")) {
    targetDate.setDate(now.getDate() + 1);
    summary = summary.replace("พรุ่งนี้", "").trim();
  } else if (text.includes("มะรืน")) {
    targetDate.setDate(now.getDate() + 2);
    summary = summary.replace("มะรืน", "").trim();
  }

  // 2. เช็คเวลา (รองรับ: 9 โมง, 10.30, 14:00)
  let hour = now.getHours() + 1; // ค่า Default: ชั่วโมงถัดไป
  let minute = 0;

  // Regex จับเวลาแบบต่างๆ
  const timeMatch = text.match(/(\d{1,2})[:.]?(\d{2})?\s*(โมง|น\.|am|pm)?/);
  
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    let m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    
    // แปลง "บ่าย X โมง" หรือ "2 pm"
    if (text.includes("บ่าย") || text.includes("pm") || (text.includes("เย็น") && h < 12)) {
      if (h < 12) h += 12;
    }
    // กรณีพิมพ์ 9 โมง (เช้า)
    else if (text.includes("เช้า") || text.includes("am")) {
       // ไม่ต้องทำอะไร
    }
    
    hour = h;
    minute = m;
  }

  // ตั้งเวลา Start
  targetDate.setHours(hour, minute, 0, 0);

  // ตั้งเวลา End (บวก 1 ชม.)
  const endDate = new Date(targetDate);
  endDate.setHours(hour + 1);

  return {
    summary: summary + " (AI)", // เติมท้ายให้รู้ว่าระบบทำงาน
    start: targetDate.toISOString(),
    end: endDate.toISOString()
  };
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return new Response("Unauthorized", { status: 401 });

  try {
    const { prompt } = await req.json();

    // --- เรียกใช้สมองกลที่เราเขียนเอง (ไม่ต้องง้อ Google) ---
    const eventData = extractEventData(prompt);

    console.log("Creating event:", eventData); // ดู Log ใน Vercel ได้เลย

    // --- ส่งเข้า Google Calendar ---
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: eventData.summary,
        start: { dateTime: eventData.start, timeZone: 'Asia/Bangkok' }, // ระบุ TimeZone ให้ชัด
        end: { dateTime: eventData.end, timeZone: 'Asia/Bangkok' },
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response("Error: " + error.message, { status: 500 });
  }
}