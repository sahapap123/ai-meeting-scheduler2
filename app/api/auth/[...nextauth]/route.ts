import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";
import type { Session, Account } from "next-auth";

// รีเฟรช access_token ด้วย refresh_token ของ Google
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
      // expires_in เป็นวินาที → แปลงเป็น ms และเผื่อเวลา 30 วิ
      accessTokenExpires: Date.now() + (data.expires_in ?? 3600) * 1000 - 30_000,
      // ถ้าไม่คืน refresh_token มารอบรีเฟรช ให้ใช้ตัวเดิม
      refreshToken: data.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
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
    async jwt({
      token,
      account,
    }: {
      token: JWT & {
        accessToken?: string;
        refreshToken?: string;
        accessTokenExpires?: number;
        error?: "RefreshAccessTokenError" | "NoRefreshToken";
      };
      account: Account | null;
    }) {
      // เพิ่งล็อกอินครั้งแรก → รับค่าจาก Google
      if (account) {
        // ถ้า Google ไม่ส่งมา ให้คงค่าเดิมไว้ (กัน undefined)
        token.accessToken = account.access_token ?? token.accessToken;
        token.refreshToken = account.refresh_token ?? token.refreshToken;

        const expiresSec = account.expires_at ?? 3600; // วินาที
        token.accessTokenExpires = Date.now() + expiresSec * 1000 - 30_000;
        return token;
      }

      // ยังไม่หมดอายุ → ใช้ต่อ
      if (token.accessToken && token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // หมดอายุแล้ว → รีเฟรช (ต้องมี refreshToken)
      if (token.refreshToken) {
        return await refreshAccessToken(token);
      }

      // ไม่มี refreshToken → ให้ไปล็อกอินใหม่
      return { ...token, error: "NoRefreshToken" };
    },

    async session({
      session,
      token,
    }: {
      session: Session & { accessToken?: string; error?: string };
      token: JWT & { accessToken?: string; error?: string };
    }) {
      (session as any).accessToken = (token as any).accessToken;
      (session as any).error = (token as any).error;
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
