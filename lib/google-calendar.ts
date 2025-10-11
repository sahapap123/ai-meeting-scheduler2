// lib/google-calendar.ts
import { google } from "googleapis";
import { zonedTimeToUtc } from "date-fns-tz";   // ➊ ADD
import { formatISO } from "date-fns";           // ➋ ADD

export class GoogleCalendar {
  private calendar: ReturnType<typeof google.calendar>;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: "v3", auth });
  }

  async quickAddEvent(text: string) {
    const res = await this.calendar.events.quickAdd({
      calendarId: "primary",
      text,
    });
    return res.data;
  }

  // ✅ แก้ให้มั่นใจเรื่องโซนเวลา: local(Asia/Bangkok) -> UTC ก่อนส่ง
  async createEvent(opts: { summary: string; start: Date; end: Date; timeZone?: string }) {
    const timeZone = opts.timeZone || "Asia/Bangkok";

    // แปลง "เวลาโลคอลของไทย" ให้เป็นเวลาจริงใน UTC
    const startUtc = zonedTimeToUtc(opts.start, timeZone);
    const endUtc   = zonedTimeToUtc(opts.end,   timeZone);

    // ส่งเป็น RFC3339 แบบ UTC (มี Z) ให้ Google
    const res = await this.calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: opts.summary,
        start: { dateTime: formatISO(startUtc) }, // e.g. 2025-10-12T07:00:00Z
        end:   { dateTime: formatISO(endUtc)   },
        // จะใส่ timeZone ประกอบด้วยก็ได้/ไม่ใส่ก็ได้ เมื่อส่งเป็น UTC แล้ว
      },
    });
    return res.data;
  }
}

export function createGoogleCalendar(accessToken: string) {
  return new GoogleCalendar(accessToken);
}
