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
  return (
    <main className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light p-3">
      <div className="position-absolute top-0 end-0 m-3 d-flex gap-2">
        {browserHasTTS && (
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setTtsEnabled(v => !v)}
          >
            <Volume2 size={16} className="me-2" />
            {ttsEnabled ? "เสียง: เปิด" : "เสียง: ปิด"}
          </button>
        )}
        <button className="btn btn-outline-danger btn-sm" onClick={() => signOut()}>
          <LogOut size={16} className="me-2" />
          ออกจากระบบ
        </button>
      </div>

      <div className="card shadow-lg" style={{ maxWidth: "500px", width: "100%" }}>
        <div className="card-header text-center bg-primary text-white">
          <h4 className="fw-bold mb-0">🤖 AI ผู้ช่วยจัดตารางประชุม</h4>
        </div>
        <div className="card-body p-4">
          <p className="text-muted text-center mb-3">
            ล็อกอินในชื่อ: <strong>{session.user?.email}</strong>
          </p>

          <div className="input-group mb-3">
            <input
              type="text"
              className="form-control form-control-lg"
              placeholder="พูดหรือพิมพ์ เช่น 'วันนี้มีประชุมไหม?'"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleClick()}
              disabled={isLoading}
            />
          </div>

          <div className="d-flex gap-2 mb-3">
            {isRecording ? (
              <button className="btn btn-danger w-100" onClick={stopRecord}>
                <StopCircle className="me-2" /> หยุดฟัง
              </button>
            ) : (
              <button
                className="btn btn-secondary w-100"
                onClick={startRecord}
                disabled={!browserHasSTT}
              >
                <Mic className="me-2" /> พูดด้วยเสียง
              </button>
            )}
          </div>

          <button
  className="btn btn-success w-100 py-2 fw-bold"
  onClick={handleClick}
  disabled={isLoading || text.trim() === ""}>
  {isLoading ? (
    <span>
      <Loader2 className="me-2 spinner-border spinner-border-sm" /> กำลังประมวลผล...
    </span>
  ) : (
    "ส่งให้ AI วิเคราะห์"
  )}
</button>

{reply && (
  <div
    className={`alert mt-4 ${
      typeof reply === "string" && reply.includes("ผิดพลาด")
        ? "alert-danger"
        : "alert-success"
    }`}>
    {reply}
  </div>
)}

        </div>
      </div>
    </main>
  );
}
