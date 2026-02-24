// app/api/get-events/route.ts
import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// 🔥 บรรทัดนี้สำคัญมาก! สั่งให้ Next.js ห้ามจำค่าเก่า (No Cache)
export const dynamic = 'force-dynamic'; 

export async function GET() {
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return new Response("Unauthorized", { status: 401 });

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    // ตั้งเวลาเริ่มต้นค้นหา: "00:00 น. ของวันนี้ (เวลาไทย)"
    // เพื่อให้เห็นนัดหมายของวันนี้ทั้งหมด
    const nowTH = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    nowTH.setHours(0, 0, 0, 0);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: nowTH.toISOString(), // ค้นหาตั้งแต่วันนี้เป็นต้นไป
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return new Response(JSON.stringify({ events: response.data.items || [] }), { status: 200 });
  } catch (error: any) {
    return new Response("Fetch Error: " + error.message, { status: 500 });
  }
}