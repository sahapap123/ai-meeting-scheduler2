// lib/google-calendar.ts
import { OAuth2Client } from "google-auth-library";
import { google, calendar_v3 } from "googleapis";
import { Session } from "next-auth";

export class GoogleCalendar {
    private auth: OAuth2Client;
    private calendar: calendar_v3.Calendar;

    constructor(session: Session) {
        this.auth = new OAuth2Client({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        });
        this.auth.setCredentials({
            access_token: session.accessToken as string,
            refresh_token: session.refreshToken as string,
        });
        this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    }

    async createEvent(eventDetails: { summary: string; startTime: string; endTime: string; }) {
        try {
            const response = await this.calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: eventDetails.summary,
                    start: { dateTime: eventDetails.startTime, timeZone: 'Asia/Bangkok' },
                    end: { dateTime: eventDetails.endTime, timeZone: 'Asia/Bangkok' },
                },
            });
            return response.data;
        } catch (error) {
            console.error("Error creating event:", error);
            throw new Error("Failed to create Google Calendar event.");
        }
    }

    async checkAvailability(startTime: string, endTime: string): Promise<calendar_v3.Schema$Event[]> {
        try {
            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: startTime,
                timeMax: endTime,
                maxResults: 5,
                singleEvents: true,
                orderBy: 'startTime',
            });
            return response.data.items || [];
        } catch (error) {
            console.error("Error checking availability:", error);
            throw new Error("Failed to check Google Calendar availability.");
        }
    }
}