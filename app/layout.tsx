// app/layout.tsx
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap/dist/css/bootstrap.min.css";

import type { Metadata } from "next";
import { Inter as FontSans, Press_Start_2P as Pixel } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import NextAuthProviders from "./providers";

const fontSans = FontSans({ subsets: ["latin"], variable: "--font-sans" });
const pixel = Pixel({ weight: "400", subsets: ["latin"], variable: "--font-pixel" });

export const metadata: Metadata = {
  title: "AI Meeting Scheduler 🤖",
  description: "An intelligent assistant for scheduling Google Calendar events.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen font-sans antialiased cyber-bg crt", // <<<< พื้นหลัง+สแกนไลน์
          fontSans.variable,
          pixel.variable
        )}
      >
        <NextAuthProviders>{children}</NextAuthProviders>
      </body>
    </html>
  );
}
