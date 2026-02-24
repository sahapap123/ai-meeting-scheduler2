// app/api/create-event/route.ts
import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// --- สมองกลคำนวณเวลาไทย (รอดชัวร์ 100%) ---
function extractEventData(text: string) {
  // 1. ดึงเวลาปัจจุบัน และบังคับให้เป็นโซนเวลา "กรุงเทพฯ" ทันที
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  let targetDate = new Date(now);
  let summary = text;

  // 2. เช็คคำว่า พรุ่งนี้
  if (text.includes("พรุ่งนี้")) {
    targetDate.setDate(now.getDate() + 1);
    summary = summary.replace("พรุ่งนี้", "").trim();
  }

  // 3. จับตัวเลขเวลา
  let hour = now.getHours() + 1; // Default: อีก 1 ชม.
  let minute = 0;

  const timeMatch = text.match(/(\d{1,2})[:.]?(\d{2})?/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    let m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

    // แปลงเวลาแบบคนไทย
    if (text.includes("ทุ่ม")) {
      h = h < 6 ? h + 18 : h; // 1 ทุ่ม = 19
    } else if (text.includes("บ่าย")) {
      h = h < 6 ? h + 12 : h; // บ่าย 2 = 14
    } else if (text.includes("เย็น") || text.includes("กลางคืน")) {
      h = h < 12 ? h + 12 : h; // 5 โมงเย็น = 17, 9 โมงเย็น = 21
    }

    hour = h;
    minute = m;
  }

  // 4. บังคับสร้าง String เวลาแบบ Local (ไม่มี Z ตัวอักษรอเมริกาต่อท้าย)
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = targetDate.getFullYear();
  const m = pad(targetDate.getMonth() + 1);
  const d = pad(targetDate.getDate());
  
  // เวลาเริ่ม
  const startString = `${y}-${m}-${d}T${pad(hour)}:${pad(minute)}:00`;
  // เวลาจบ (บวก 1 ชม.)
  const endString = `${y}-${m}-${d}T${pad(hour === 23 ? 23 : hour + 1)}:${pad(minute)}:00`;

  return {
    summary: summary + " 🎯", // ใส่เป้ายิงให้รู้ว่าติดสมองกลตัวใหม่แล้ว
    start: startString,
    end: endString
  };
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return new Response("Unauthorized", { status: 401 });

  try {
    const { prompt } = await req.json();

    // เรียกใช้ฟังก์ชันเวลาไทยของเรา
    const eventData = extractEventData(prompt);

    // ส่งให้ Google Calendar (พร้อมระบุว่านี่คือเวลาไทยนะ!)
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: eventData.summary,
        start: { dateTime: eventData.start, timeZone: 'Asia/Bangkok' }, // บังคับเป็นไทย
        end: { dateTime: eventData.end, timeZone: 'Asia/Bangkok' }, // บังคับเป็นไทย
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response("Error: " + error.message, { status: 500 });
  }
}