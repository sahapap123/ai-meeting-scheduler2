'use client';

import React, { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
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

  // 🎙️ Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const recRef = useRef<any>(null);

  const getSRClass = (): any | null => {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  };

  const browserHasSTT = typeof window !== "undefined" && !!getSRClass();
  const browserHasTTS = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    return () => {
      try { recRef.current?.stop(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, []);

  // 🎤 Start recording voice
  const startRecord = () => {
    const SRClass = getSRClass();
    if (!SRClass) {
      setReply("เบราว์เซอร์ยังไม่รองรับการรู้จำเสียง (แนะนำ Chrome/Edge ล่าสุด)");
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

  // 🔍 ตรวจจับว่าผู้ใช้กำลัง "ถามตาราง" แทนที่จะ "สร้างนัด"
  function isQueryIntent(text: string): boolean {
    if (!text) return false;
    const q = text
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[๐๑๒๓๔๕๖๗๘๙]/g, (ch) =>
        "๐๑๒๓๔๕๖๗๘๙".indexOf(ch).toString()
      );

    return (
      q.includes("มีประชุมไหม") ||
      q.includes("วันนี้มีประชุม") ||
      q.includes("พรุ่งนี้มีประชุม") ||
      q.includes("วันไหนบ้าง") ||
      q.includes("สัปดาห์นี้") ||
      q.includes("เดือนนี้") ||
      q.includes("ตาราง") ||
      q.includes("คิว") ||
      q.includes("ว่างไหม")
    );
  }

  const handleClick = async () => {
    if (text.trim() === "" || isLoading) return;
    setIsLoading(true);
    setReply("AI กำลังวิเคราะห์...");

    const endpoint = isQueryIntent(text)
      ? "/api/auth/calendar/smart_query"
      : "/api/auth/calendar/quick";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (res.ok && data.text_response) {
        setReply(data.text_response);
        speakThai(data.text_response);
      } else if (res.ok && data.event) {
        const msg = `สร้างนัดหมาย ${data.event.summary} สำเร็จแล้ว`;
        setReply(
          <span>
            {msg} ✅{" "}
            <a
              href={data.event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary fw-bold"
            >
              (ดูใน Google Calendar)
            </a>
          </span>
        );
        speakThai(msg);
      } else {
        setReply(`เกิดข้อผิดพลาด: ${data.error || "Unknown error"}`);
      }
    } catch {
      setReply("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
      setIsLoading(false);
    }
  };

  // 🌈 RETURN UI (Bootstrap version)
  // …(โค้ด State/ฟังก์ชันของคุณคงเดิมด้านบน)…

return (
  <main className="min-vh-100 d-flex align-items-center justify-content-center p-4">
    {/* มุมขวาบน: ปุ่มเสียง/ออกจากระบบ */}
    <div className="position-absolute top-0 end-0 m-3 d-flex gap-2">
      {browserHasTTS && (
        <button
          className="pixel-btn btn"
          onClick={() => setTtsEnabled(v => !v)}
          title="สลับการอ่านออกเสียง"
        >
          <Volume2 className="me-2" size={16} />
          {ttsEnabled ? "เสียง: เปิด" : "เสียง: ปิด"}
        </button>
      )}
      <button className="pixel-btn pixel-btn-danger btn" onClick={() => signOut()}>
        <LogOut className="me-2" size={16} />
        ออกจากระบบ
      </button>
    </div>

    {/* การ์ดหลัก */}
    <div className="pixel-card w-100" style={{ maxWidth: 560 }}>
      <div className="pixel-head py-3 text-center">
        <h4 className="h-pixel neon m-0">AI Meeting Scheduler</h4>
      </div>

      <div className="p-4">
        <p className="text-center text-muted mb-3">
          ล็อกอินในชื่อ: <strong>{session.user?.email}</strong>
        </p>

        {/* กล่อง input */}
        <input
          type="text"
          className="pixel-input form-control form-control-lg mb-3"
          placeholder="พูดหรือพิมพ์ เช่น 'พรุ่งนี้สองทุ่มประชุม' หรือ 'วันนี้มีประชุมไหม?'"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleClick()}
          disabled={isLoading}
        />

        {/* ปุ่มพูดด้วยเสียง */}
        <div className="d-flex gap-2 mb-3">
          {isRecording ? (
            <button className="pixel-btn pixel-btn-danger btn w-100" onClick={stopRecord}>
              <StopCircle className="me-2" /> หยุดฟัง
            </button>
          ) : (
            <button
              className="pixel-btn btn w-100"
              onClick={startRecord}
              disabled={!browserHasSTT}
              title={!browserHasSTT ? "เบราว์เซอร์ไม่รองรับการรู้จำเสียง" : "กดเพื่อพูด"}
            >
              <Mic className="me-2" /> พูดด้วยเสียง
            </button>
          )}
        </div>

        {/* ปุ่มส่ง */}
        <button
          className="pixel-btn btn w-100 py-2"
          onClick={handleClick}
          disabled={isLoading || text.trim() === ""}
        >
          {isLoading ? (
            <span className="d-inline-flex align-items-center">
              <Loader2 className="me-2 spinner-border spinner-border-sm" /> กำลังประมวลผล...
            </span>
          ) : (
            "ส่งให้ AI วิเคราะห์"
          )}
        </button>

        {/* แถบข้อความตอบกลับ */}
        {reply && (
          <div
            className={
              "mt-4 p-3 rounded " +
              (typeof reply === "string" && reply.includes("ผิดพลาด")
                ? "alert-cyber-danger"
                : "alert-cyber")
            }
          >
            {reply}
          </div>
        )}
      </div>
    </div>
  </main>
);
}
