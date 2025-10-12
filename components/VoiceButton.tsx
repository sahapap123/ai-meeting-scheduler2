// components/VoiceButton.tsx
"use client";
import { useEffect, useRef, useState } from "react";

type Props = { onText: (text: string) => void };

export default function VoiceButton({ onText }: Props) {
  const [recording, setRecording] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.lang = "th-TH";        // ใช้ไทยก่อน (จะพูดอังกฤษก็จับได้ส่วนใหญ่)
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (e: any) => {
        const text = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
        onText(text);
      };
      rec.onend = () => setRecording(false);
      recRef.current = rec;
    }
  }, [onText]);

  const toggle = () => {
    if (!recRef.current) {
      alert("เบราว์เซอร์นี้ยังไม่รองรับ Speech Recognition");
      return;
    }
    if (recording) {
      recRef.current.stop();
    } else {
      setRecording(true);
      recRef.current.start();
    }
  };

  return (
    <button type="button" className="btn btn-warning btn-pixel" onClick={toggle}>
      {recording ? "กำลังฟัง..." : "พูด"}
    </button>
  );
}
