// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
    };
  } catch (error) {
    return { ...token, error: "RefreshAccessTokenError" };
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
            "openid", "email", "profile",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }: any) {
      if (account) {
        // แก้ตัวแดง: ใช้ ?? "" เพื่อป้องกันค่า undefined
        token.accessToken = account.access_token ?? "";
        token.refreshToken = account.refresh_token ?? "";
        token.accessTokenExpires = Date.now() + (account.expires_at ?? 3600) * 1000;
      }
      if (Date.now() < (token.accessTokenExpires as number)) return token;
      return await refreshAccessToken(token);
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };