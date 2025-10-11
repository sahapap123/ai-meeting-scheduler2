// lib/google-calendar.ts
import { google } from "googleapis";
import * as tz from "date-fns-tz";   // ✅ ใช้ namespace import
import { formatISO } from "date-fns";

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

  // ใช้เวลาโลคอล (Asia/Bangkok) -> แปลงเป็น UTC ก่อนส่งให้ Google
  async createEvent(opts: { summary: string; start: Date; end: Date; timeZone?: string }) {
    const timeZone = opts.timeZone || "Asia/Bangkok";

    const startUtc = tz.zonedTimeToUtc(opts.start, timeZone); // ✅
    const endUtc   = tz.zonedTimeToUtc(opts.end,   timeZone); // ✅

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
