// lib/google-calendar.ts
import { google } from "googleapis";
import * as tz from "date-fns-tz";
import { formatISO } from "date-fns";

export class GoogleCalendar {
  private calendar: ReturnType<typeof google.calendar>;
  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: "v3", auth });
  }

  async quickAddEvent(text: string) {
    const res = await this.calendar.events.quickAdd({ calendarId: "primary", text });
    return res.data;
  }

  // ✅ รับ "เวลาแบบไทย" (สตริง) แล้วแปลงเป็น UTC ก่อนส่งให้ Google
  async createEvent(opts: {
    summary: string;
    date: string;          // "YYYY-MM-DD" (ตาม Asia/Bangkok)
    start: string;         // "HH:mm"      (24 ชม., ตาม Asia/Bangkok)
    end?: string;          // "HH:mm"      (ถ้าไม่ให้ จะ +60 นาที)
    timeZone?: string;     // default: Asia/Bangkok
  }) {
    const tzName = opts.timeZone || "Asia/Bangkok";
    const startUtc = tz.zonedTimeToUtc(`${opts.date}T${opts.start}:00`, tzName);
    const endStr   = opts.end ?? add60(opts.start);
    const endUtc   = tz.zonedTimeToUtc(`${opts.date}T${endStr}:00`, tzName);

    const res = await this.calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: opts.summary,
        start: { dateTime: formatISO(startUtc) }, // e.g. 2025-10-12T07:00:00Z
        end:   { dateTime: formatISO(endUtc)   },
      },
    });
    return res.data;
  }
}

function add60(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  d.setMinutes(d.getMinutes() + 60);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
