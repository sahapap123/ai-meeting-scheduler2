// app/api/create-event/route.ts
import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// --- ดึงความสามารถจากโค้ดเก่ามาใช้ ---
const pad = (n: number) => String(n).padStart(2, "0");
const thaiNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

// แปลงเลขไทยเป็นอารบิก (กันคนพิมพ์ ๑-๙)
function norm(s: string) {
  const th2ar: Record<string, string> = {"๐":"0","๑":"1","๒":"2","๓":"3","๔":"4","๕":"5","๖":"6","๗":"7","๘":"8","๙":"9"};
  return s.replace(/[๐-๙]/g, ch => th2ar[ch] ?? ch).trim();
}

function extractEventData(rawText: string) {
  const text = norm(rawText); // แปลงเลขไทยก่อน
  const now = thaiNow();
  let targetDate = new Date(now);
  let summary = text;

  // 1. ตรวจจับวัน (พรุ่งนี้, มะรืน)
  if (text.includes("พรุ่งนี้")) {
    targetDate.setDate(now.getDate() + 1);
    summary = summary.replace(/พรุ่งนี้/g, "").trim();
  } else if (text.includes("มะรืน")) {
    targetDate.setDate(now.getDate() + 2);
    summary = summary.replace(/มะรืน/g, "").trim();
  }

  // 2. ตรวจจับเวลา
  let hour = now.getHours() + 1; // ค่าเริ่มต้น: อีก 1 ชั่วโมง
  let minute = 0;

  // ค้นหาตัวเลขเวลา เช่น "9 โมง", "14.30", "บ่าย 2", "1 ทุ่ม"
  const timeMatch = text.match(/(\d{1,2})[:.]?(\d{2})?\s*(โมง|ทุ่ม|บ่าย|เช้า|น\.)?/);

  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    let m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const keyword = timeMatch[3] || "";

    if (text.includes("ทุ่ม") || keyword === "ทุ่ม") {
      h = h < 6 ? h + 18 : h; // 1 ทุ่ม = 19
    } else if (text.includes("บ่าย") || keyword === "บ่าย") {
      h = h < 6 ? h + 12 : h; // บ่าย 2 = 14
    } else if (text.includes("เย็น")) {
      h = h < 12 ? h + 12 : h; // 4 โมงเย็น = 16
    }

    hour = h;
    minute = m;
    // ลบคำบอกเวลาออกจากชื่อนัดหมาย
    summary = summary.replace(timeMatch[0], "").replace(/เวลา/g, "").trim();
  }

  // 3. ประกอบร่างเวลาตามมาตรฐาน +07:00
  const y = targetDate.getFullYear();
  const mStr = pad(targetDate.getMonth() + 1);
  const dStr = pad(targetDate.getDate());
  const hStr = pad(hour);
  const minStr = pad(minute);
  
  const startRFC = `${y}-${mStr}-${dStr}T${hStr}:${minStr}:00+07:00`;
  const endHour = hour === 23 ? 23 : hour + 1; // ป้องกันบวกข้ามวันพัง
  const endRFC = `${y}-${mStr}-${dStr}T${pad(endHour)}:${minStr}:00+07:00`;

  return {
    summary: summary + " 🤖",
    start: startRFC,
    end: endRFC
  };
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return new Response("Unauthorized", { status: 401 });

  try {
    const { prompt } = await req.json();
    const eventData = extractEventData(prompt);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: eventData.summary,
        // ไม่ต้องระบุ timeZone แล้ว เพราะเราแนบ +07:00 เข้าไปในตัวแปรแล้ว
        start: { dateTime: eventData.start },
        end: { dateTime: eventData.end },
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response("Error: " + error.message, { status: 500 });
  }
}