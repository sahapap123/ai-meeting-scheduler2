// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";
import type { Session, Account } from "next-auth";

// ฟังก์ชันสำหรับรีเฟรช access_token เมื่อหมดอายุ
async function refreshAccessToken(token: any) {
  try {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok) throw data;

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + (data.expires_in ?? 3600) * 1000 - 30_000,
      refreshToken: data.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing access token", error);
    return { ...token, error: "RefreshAccessTokenError" as const };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          include_granted_scopes: "true",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
        },
      },
    }),
  ],

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },

  callbacks: {
    async jwt({ token, account }) {
      // เมื่อล็อกอินครั้งแรก
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        const expiresSec = account.expires_at ?? 3600;
        token.accessTokenExpires = Date.now() + expiresSec * 1000 - 30_000;
        return token;
      }

      // ถ้า token ยังไม่หมดอายุ
      if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // ถ้าหมดอายุแล้ว ให้รีเฟรช
      if (token.refreshToken) {
        return await refreshAccessToken(token);
      }

      return { ...token, error: "NoRefreshToken" };
    },

    // --- ส่วนที่ปรับปรุงใหม่ พร้อมระบบตรวจสอบ Log ---
    async session({ session, token }: { session: any; token: any }) {
      session.accessToken = token.accessToken;
      session.error = token.error;

      // ตรวจสอบสถานะ Token ในหน้าจอ Terminal (Vercel Logs)
      if (session.accessToken) {
        console.log("✅ [Auth Success] Session has accessToken");
      } else {
        console.log("❌ [Auth Error] Session MISSING accessToken");
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch {}
      return baseUrl + "/";
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };