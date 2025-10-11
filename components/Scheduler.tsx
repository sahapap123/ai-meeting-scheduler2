// components/Scheduler.tsx
'use client';
import React, { useState } from "react";
import { signOut } from "next-auth/react"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut } from "lucide-react";
import { Session } from "next-auth";

export default function Scheduler({ session }: { session: Session }) {
  const [text, setText] = useState("");
  const [reply, setReply] = useState<string | React.ReactNode>(""); 
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (text.trim() === "" || isLoading) return;
    setIsLoading(true);
    setReply("AI กำลังวิเคราะห์...");
    try {
      // เราจะใช้ API ของ OpenAI ที่ทำงานได้สมบูรณ์แล้ว
      const response = await fetch("/api/auth/calendar/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
      });
      const data = await response.json();

      if (response.ok && data.event) {
        const successMessage = (
          <span>
            สร้างนัดหมาย <strong>'{data.event.summary}'</strong> สำเร็จ! ✅{" "}
            <a href={data.event.htmlLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                (ดูใน Google Calendar)
            </a>
          </span>
        );
        setReply(successMessage);
      } else if (response.ok && data.text_response) {
        setReply(data.text_response);
      } else {
        setReply(`เกิดข้อผิดพลาด: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
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
            <span role="img" aria-label="robot" className="mr-2">🤖</span> AI ผู้ช่วยนัดตารางประชุม
          </CardTitle>
          <p className="text-sm text-muted-foreground pt-2">
            ล็อกอินในชื่อ: <strong>{session.user?.email}</strong>
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Input
            id="prompt-input" type="text" placeholder="เช่น ประชุมพรุ่งนี้ 10 โมง หรือ วันนี้ว่างไหม?"
            value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
            disabled={isLoading} className="h-12 text-base"
          />
          <Button onClick={handleClick} disabled={isLoading || text.trim() === ""} className="w-full h-12 text-base font-semibold">
            {isLoading ? (
              <span className="flex items-center justify-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังประมวลผล...</span>
            ) : ( "ส่งให้ AI วิเคราะห์" )}
          </Button>
          {reply && (
            <div className={`mt-4 p-4 rounded-lg text-center text-sm border ${
              typeof reply === 'string' && reply.includes("ผิดพลาด")
                ? 'bg-red-50/50 border-red-200 text-red-800'
                : 'bg-green-50/50 border-green-200 text-green-800'
            }`}>
              {reply}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}