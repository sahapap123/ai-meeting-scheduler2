// app/api/create-event/route.ts
import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// --- 1. Helper จากโค้ดเก่า (Smart Query) ---
const pad = (n: number) => String(n).padStart(2, "0");

// เวลาไทย ณ ปัจจุบัน (บังคับโซน Asia/Bangkok)
const thaiNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

// แปลงเลขไทยเป็นอารบิก (๑ -> 1)
function norm(s: string) {
  const th2ar: Record<string, string> = {"๐":"0","๑":"1","๒":"2","๓":"3","๔":"4","๕":"5","๖":"6","๗":"7","๘":"8","๙":"9"};
  return s.replace(/[๐-๙]/g, ch => th2ar[ch] ?? ch).trim();
}

// --- 2. ฟังก์ชันสมองกล: แกะเวลาและวันที่ ---
function extractEventData(rawText: string) {
  const text = norm(rawText); // แปลงเลขไทยก่อน
  const now = thaiNow();
  let targetDate = new Date(now);
  let summary = text;

  // --- เช็ควัน (พรุ่งนี้, มะรืน) ---
  if (text.includes("พรุ่งนี้")) {
    targetDate.setDate(now.getDate() + 1);
    summary = summary.replace(/พรุ่งนี้/g, "").trim();
  } else if (text.includes("มะรืน")) {
    targetDate.setDate(now.getDate() + 2);
    summary = summary.replace(/มะรืน/g, "").trim();
  }

  // --- เช็คเวลา (9 โมง, บ่าย 2, 19.30) ---
  // ค่า Default: ชั่วโมงถัดไป
  let hour = now.getHours() + 1; 
  let minute = 0;

  // Regex จับเวลา: เจอเลข 1-2 หลัก ตามด้วย : หรือ . (ถ้ามี)
  const timeMatch = text.match(/(\d{1,2})[:.]?(\d{2})?\s*(โมง|ทุ่ม|บ่าย|เช้า|น\.|am|pm)?/);

  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    let m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const keyword = (timeMatch[3] || "").toLowerCase();

    // แปลงคำพูดเป็นเวลา 24 ชม.
    if (text.includes("ทุ่ม") || keyword === "ทุ่ม") {
      h = h < 12 ? h + 18 : h; // 1 ทุ่ม = 19
    } else if (text.includes("บ่าย") || keyword === "บ่าย" || keyword === "pm") {
      if (h < 12) h += 12; // บ่าย 2 = 14
    } else if (text.includes("เย็น")) {
      h = h < 12 ? h + 12 : h; // 4 โมงเย็น = 16
    } else if (text.includes("ตี")) {
      // ตี 5 = 5 (ไม่ต้องทำอะไร)
    } 

    hour = h;
    minute = m;
    
    // ลบคำบอกเวลาออกจากชื่อนัดหมาย เพื่อให้ชื่อคลีนๆ
    summary = summary.replace(timeMatch[0], "").replace(/เวลา/g, "").trim();
  }

  // --- 3. ประกอบร่างเวลามาตรฐาน RFC3339 (+07:00) ---
  // ใช้ Logic เดียวกับโค้ดเก่าเพื่อให้ Google Calendar วางลงล็อกเป๊ะๆ
  const y = targetDate.getFullYear();
  const mStr = pad(targetDate.getMonth() + 1);
  const dStr = pad(targetDate.getDate());
  
  // Start Time
  const startRFC = `${y}-${mStr}-${dStr}T${pad(hour)}:${pad(minute)}:00+07:00`;
  
  // End Time (บวก 1 ชม.)
  let endHour = hour + 1;
  // กรณีข้ามวัน (เช่น นัด 23:00 จบ 00:00) ให้ตัดจบที่ 23:59 ไปก่อนเพื่อความง่าย
  if (endHour >= 24) endHour = 23; 
  const endRFC = `${y}-${mStr}-${dStr}T${pad(endHour)}:${pad(minute)}:00+07:00`;

  return {
    summary: summary || "นัดหมายใหม่ (AI)", // ถ้าชื่อว่าง ให้ใส่ default
    start: startRFC,
    end: endRFC
  };
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return new Response("Unauthorized", { status: 401 });

  try {
    const { prompt } = await req.json();
    
    // เรียกใช้ฟังก์ชัน Fusion ของเรา
    const eventData = extractEventData(prompt);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: eventData.summary + " 🤖", // เติมไอคอนให้รู้ว่าบอทสร้าง
        start: { dateTime: eventData.start }, // ไม่ต้องระบุ timeZone เพราะมี +07:00 แล้ว
        end: { dateTime: eventData.end },
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response("Error: " + error.message, { status: 500 });
  }
}