// next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

// ขยาย JWT token
declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    refreshToken: string;
  }
}

// ขยาย Session ที่ใช้ในฝั่ง Client
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    accessToken: string;
    refreshToken: string;
  }
}