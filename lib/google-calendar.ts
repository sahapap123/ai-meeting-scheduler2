// lib/google-calendar.ts
import { google } from "googleapis";

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

// lib/google-calendar.ts (เฉพาะเมธอด createEvent แก้เป็นแบบนี้)
  async createEvent(opts: { summary: string; start: Date; end: Date; timeZone?: string }) {
    const timeZone = opts.timeZone || "Asia/Bangkok";

    // สร้าง ISO แบบไม่มีโซน (local wall time) เพื่อให้คู่กับ timeZone ได้ตรง
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;

    const res = await this.calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: opts.summary,
        start: { dateTime: fmt(opts.start), timeZone },
        end:   { dateTime: fmt(opts.end),   timeZone },
      },
    });
    return res.data;
  }
}