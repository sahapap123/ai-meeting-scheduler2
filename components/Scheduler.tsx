// components/Scheduler.tsx
'use client';

import React, { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut, Mic, StopCircle, Volume2 } from "lucide-react";
import type { Session } from "next-auth";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export default function Scheduler({ session }: { session: Session }) {
  const [text, setText] = useState("");
  const [reply, setReply] = useState<string | React.ReactNode>("");
  const [isLoading, setIsLoading] = useState(false);

  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const recRef = useRef<any>(null);

  // helper: มี SpeechRecognition ไหม
  const getSRClass = (): any | null => {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  };

  const browserHasSTT = typeof window !== "undefined" && !!getSRClass();
  const browserHasTTS = typeof window !== "undefined" && "speechSynthesis" in window;

  // cleanup เมื่อออกจากหน้า
  useEffect(() => {
    return () => {
      try { recRef.current?.stop(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, []);

  // ---- Speech To Text ----
  const startRecord = () => {
    const SRClass = getSRClass();
    if (!SRClass) {
      setReply("เบราว์เซอร์นี้ยังไม่รองรับการรู้จำเสียง (แนะนำ Chrome/Edge รุ่นล่าสุด)");
      return;
    }
    if (isRecording) return;

    const rec = new SRClass();
    rec.lang = "th-TH";
    rec.interimResults = true;
    rec.continuous = true;

    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setText((finalText + " " + interim).trim());
    };
    rec.onerror = (e: any) => {
      setIsRecording(false);
      setReply(`ไมค์มีปัญหา: ${e.error || "unknown"}`);
    };
    rec.onend = () => setIsRecording(false);

    recRef.current = rec;
    rec.start();
    setIsRecording(true);
  };

  const stopRecord = () => {
    try { recRef.current?.stop(); } catch {}
    setIsRecording(false);
  };

  // ---- Text To Speech ----
  const speakThai = (msg: string) => {
    if (!browserHasTTS || !ttsEnabled) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(msg);
      u.lang = "th-TH";
      const voices = window.speechSynthesis.getVoices();
      const th = voices.find(v => v.lang?.toLowerCase().startsWith("th"));
      if (th) u.voice = th;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const handleClick = async () => {
    if (text.trim() === "" || isLoading) return;
    setIsLoading(true);
    setReply("AI กำลังวิเคราะห์...");

    try {
      const response = await fetch("/api/auth/calendar/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();

      if (response.ok && data.event) {
        const success = (
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
        setReply(success);
        speakThai(`สร้างนัดหมาย ${data.event.summary} สำเร็จ`);
      } else if (response.ok && data.text_response) {
        setReply(data.text_response);
        if (typeof data.text_response === "string") speakThai(data.text_response);
      } else {
        const err = `เกิดข้อผิดพลาด: ${data.error || "Unknown error"}`;
        setReply(err);
        speakThai(err);
      }
    } catch {
      const err = "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์";
      setReply(err);
      speakThai(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        {browserHasTTS && (
          <Button
            variant="outline"
            onClick={() => setTtsEnabled(v => !v)}
            className="text-sm"
            title="สลับการอ่านออกเสียง"
          >
            <Volume2 className="mr-2 h-4 w-4" />
            {ttsEnabled ? "เสียง: เปิด" : "เสียง: ปิด"}
          </Button>
        )}
        <Button variant="outline" onClick={() => signOut()} className="text-sm">
          <LogOut className="mr-2 h-4 w-4" /> ออกจากระบบ
        </Button>
      </div>

      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center justify-center">
            <span className="mr-2">🤖</span> AI ผู้ช่วยนัดตารางประชุม
          </CardTitle>
          <p className="text-sm text-muted-foreground pt-2">
            ล็อกอินในชื่อ: <strong>{session.user?.email}</strong>
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="flex gap-2">
            <Input
              id="prompt-input"
              type="text"
              placeholder="พูดหรือพิมพ์: เช่น ‘พรุ่งนี้สองทุ่มประชุม’ หรือ ‘วันนี้ว่างไหม?’"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleClick()}
              disabled={isLoading}
              className="h-12 text-base"
            />
            {isRecording ? (
              <Button
                variant="destructive"
                onClick={stopRecord}
                className="h-12 px-3"
                title="หยุดฟัง"
              >
                <StopCircle className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={startRecord}
                className="h-12 px-3"
                title="กดเพื่อพูด"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>

          <Button
            onClick={handleClick}
            disabled={isLoading || text.trim() === ""}
            className="w-full h-12 text-base font-semibold"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังประมวลผล...
              </span>
            ) : (
              "ส่งให้ AI วิเคราะห์"
            )}
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
