// components/Scheduler.tsx
'use client';
import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut } from "lucide-react";
import { Session } from "next-auth";

// ตรวจ intent แบบง่าย: ถ้ามีคำถามเกี่ยวกับ “มีนัดไหม/ว่างไหม/วันไหนบ้าง” ให้เข้าช่อง smart_query
function isQueryIntent(raw: string) {
  const q = (raw || "").toLowerCase().trim();
  // คำหลักฝั่งถามตาราง
  const ask = /(มีนัด|มีประชุม|ว่าง|วันไหน|เมื่อไหร่|\?)/;
  return ask.test(q);
}

export default function Scheduler({ session }: { session: Session }) {
  const [text, setText] = useState("");
  const [reply, setReply] = useState<string | React.ReactNode>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (text.trim() === "" || isLoading) return;

    // เลือกปลายทางตาม intent
    const endpoint = isQueryIntent(text)
      ? "/api/auth/calendar/smart_query"
      : "/api/auth/calendar/quick";

    setIsLoading(true);
    setReply("AI กำลังวิเคราะห์...");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      // ถามตาราง → แสดงข้อความสรุป
      if (res.ok && data.text_response) {
        setReply(String(data.text_response));
        return;
      }

      // สร้างนัด → แสดงลิงก์ไป Calendar
      if (res.ok && data.event) {
        setReply(
          <span>
            สร้างนัดหมาย <strong>&apos;{data.event.summary}&apos;</strong> สำเร็จ! ✅{" "}
            <a
              href={data.event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              (ดูใน Google Calendar)
            </a>
          </span>
        );
        return;
      }

      // เคส error อื่น ๆ
      setReply(`เกิดข้อผิดพลาด: ${data.error || "Unknown error"}`);
    } catch (e) {
      setReply("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="absolute top-4 right-4">
        <Button variant="outline" onClick={() => signOut()} className="text-sm">
          <LogOut className="mr-2 h-4 w-4" /> ออกจากระบบ
        </Button>
      </div>

      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center justify-center">
            <span role="img" aria-label="robot" className="mr-2">🤖</span>
            AI ผู้ช่วยนัดตารางประชุม
          </CardTitle>
          <p className="text-sm text-muted-foreground pt-2">
            ล็อกอินในชื่อ: <strong>{session.user?.email}</strong>
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <Input
            id="prompt-input"
            type="text"
            placeholder="เช่น ‘นัดพรุ่งนี้ 10 โมง’ หรือ ‘วันนี้มีประชุมไหม’"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleClick()}
            disabled={isLoading}
            className="h-12 text-base"
          />
          <Button
            onClick={handleClick}
            disabled={isLoading || text.trim() === ""}
            className="w-full h-12 text-base font-semibold"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังประมวลผล...
              </span>
            ) : ("ส่งให้ AI วิเคราะห์")}
          </Button>

          {reply && (
            <div
              className={`mt-4 p-4 rounded-lg text-center text-sm border ${
                typeof reply === "string" && reply.includes("ผิดพลาด")
                  ? "bg-red-50/50 border-red-200 text-red-800"
                  : "bg-green-50/50 border-green-200 text-green-800"
              }`}
            >
              {reply}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
