// app/api/create-event/route.ts
import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const pad = (n: number) => String(n).padStart(2, "0");
const thaiNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

function norm(s: string) {
  const th2ar: Record<string, string> = {"๐":"0","๑":"1","๒":"2","๓":"3","๔":"4","๕":"5","๖":"6","๗":"7","๘":"8","๙":"9"};
  return s.replace(/[๐-๙]/g, ch => th2ar[ch] ?? ch).trim();
}

function extractEventData(rawText: string) {
  const text = norm(rawText);
  const now = thaiNow();
  let targetDate = new Date(now);
  let summary = text;

  // --- 1. จับวัน (วันที่ X, พรุ่งนี้, มะรืน) ---
  const dateMatch = text.match(/วันที่\s*(\d{1,2})/);
  if (dateMatch) {
    targetDate.setDate(parseInt(dateMatch[1]));
    summary = summary.replace(dateMatch[0], "");
  } else if (text.includes("พรุ่งนี้")) {
    targetDate.setDate(now.getDate() + 1);
    summary = summary.replace(/พรุ่งนี้/g, "");
  } else if (text.includes("มะรืน")) {
    targetDate.setDate(now.getDate() + 2);
    summary = summary.replace(/มะรืน/g, "");
  }

  // --- 2. จับเวลาและ keyword ---
  let hour = now.getHours() + 1;
  let minute = 0;

  // Regex จับเวลาแบบละเอียด (9.30, 14:00) และแบบพูด (9 โมง)
  const exactTime = text.match(/(\d{1,2})[:.](\d{2})/);
  const keywordTime = text.match(/(\d{1,2})\s*(โมง|ทุ่ม|บ่าย|เช้า|น\.|am|pm|นาฬิกา)?/);

  if (exactTime) {
    hour = parseInt(exactTime[1]);
    minute = parseInt(exactTime[2]);
    // ลบเวลาที่จับได้ออกจากชื่อ
    summary = summary.replace(exactTime[0], "");
  } else if (keywordTime) {
    let h = parseInt(keywordTime[1]);
    const keyword = (keywordTime[2] || "").toLowerCase();
    
    // แปลงเวลาพูดเป็น 24 ชม.
    if (text.includes("ทุ่ม") || keyword === "ทุ่ม") {
      h = h < 12 ? h + 18 : h;
    } else if (text.includes("บ่าย") || keyword === "บ่าย" || keyword === "pm") {
      if (h < 12) h += 12;
    } else if (text.includes("เย็น") || text.includes("ค่ำ")) {
      h = h < 12 ? h + 12 : h;
    } else if (text.includes("ตี")) {
      // ตี 5 = 05:00 (ปกติ)
    }
    
    hour = h;
    minute = 0;
    // ลบตัวเลขเวลาที่จับได้ออกจากชื่อ
    summary = summary.replace(keywordTime[0], "");
  }

  // --- 3. Big Cleaning: ลบคำขยะที่เหลือออกให้หมด ---
  // ลบคำบอกช่วงเวลาที่อาจหลงเหลืออยู่
  const junkWords = /เย็น|เช้า|บ่าย|ค่ำ|สาย|ดึก|โมง|นาฬิกา|น\.|เวลา|เดือนนี้/g;
  summary = summary.replace(junkWords, "").trim();

  // ประกอบร่างเวลา
  const y = targetDate.getFullYear();
  const mStr = pad(targetDate.getMonth() + 1);
  const dStr = pad(targetDate.getDate());
  
  const startRFC = `${y}-${mStr}-${dStr}T${pad(hour)}:${pad(minute)}:00+07:00`;
  
  let endHour = hour + 1;
  if (endHour >= 24) endHour = 23;
  const endRFC = `${y}-${mStr}-${dStr}T${pad(endHour)}:${pad(minute)}:00+07:00`;

  return {
    summary: (summary || "นัดหมาย") + " 🤖",
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
        start: { dateTime: eventData.start },
        end: { dateTime: eventData.end },
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response("Error: " + error.message, { status: 500 });
  }
}