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
}

export function createGoogleCalendar(accessToken: string) {
  return new GoogleCalendar(accessToken);
}
