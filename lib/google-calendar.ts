// lib/google-calendar.ts
import { google } from "googleapis";

export type QuickAddedEvent = Awaited<
  ReturnType<GoogleCalendar["quickAddEvent"]>
>;

class GoogleCalendar {
  private calendar: ReturnType<typeof google.calendar>;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: "v3", auth });
  }

  // เพิ่มเมธอดนี้เพื่อแก้ error ใน smart_query.ts/route.ts
  async quickAddEvent(text: string) {
    const res = await this.calendar.events.quickAdd({
      calendarId: "primary",
      text,
    });
    return res.data; // คืนค่า event ที่ Google สร้างให้
  }
}

// helper ให้สร้าง instance แบบสะดวก
export function createGoogleCalendar(accessToken: string) {
  return new GoogleCalendar(accessToken);
}
