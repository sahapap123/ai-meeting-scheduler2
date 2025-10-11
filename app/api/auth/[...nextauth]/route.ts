// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";
import type { Session, Account } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // ข้อ 3: กำหนด authorization params ให้ขอ refresh token + scope ที่ต้องใช้
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          // แนะนำให้มี openid email profile ด้วย (เทียบเท่า userinfo.*)
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({
      token,
      account,
    }: {
      token: JWT;
      account: Account | null;
    }) {
      if (account) {
        // เก็บ access_token / refresh_token จาก Google ไว้ที่ token
        (token as any).accessToken = account.access_token;
        (token as any).refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }) {
      // ส่งต่อมาไว้ที่ session (สอดคล้องกับ next-auth.d.ts ของคุณ)
      (session as any).accessToken = (token as any).accessToken;
      (session as any).refreshToken = (token as any).refreshToken;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
