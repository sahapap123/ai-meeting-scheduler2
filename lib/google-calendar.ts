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

  // ⬇️ สร้าง RFC3339 พร้อม +07:00 โดยไม่แปลงเป็น UTC
  async createEvent(opts: {
    summary: string;
    date: string;   // "YYYY-MM-DD" (วันแบบไทย)
    start: string;  // "HH:mm" (24 ชม.แบบไทย)
    end?: string;   // "HH:mm" (ไม่ใส่ = +60 นาที)
  }) {
    const startRFC3339 = toRFC3339WithOffset(opts.date, opts.start, 420); // +07:00
    const endRFC3339   = toRFC3339WithOffset(
      opts.date,
      opts.end ?? add60(opts.start),
      420
    );

    const res = await this.calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: opts.summary,
        start: { dateTime: startRFC3339 }, // เช่น 2025-10-12T10:00:00+07:00
        end:   { dateTime: endRFC3339   },
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
function toRFC3339WithOffset(date: string, time: string, offsetMin: number) {
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");
  return `${date}T${time}:00${sign}${oh}:${om}`;
}
