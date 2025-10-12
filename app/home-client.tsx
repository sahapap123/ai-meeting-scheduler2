// app/home-client.tsx
"use client";
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import VoiceButton from "@/components/VoiceButton";

export default function HomeClient() {
  const { status } = useSession();
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const analyze = async () => {
    // TODO: เรียก API จริงของคุณได้ที่นี่
    // เดโม: แค่สะท้อนกลับ
    setResult(`สรุปเบื้องต้น (เดโม): ${text.slice(0, 200)}${text.length > 200 ? "..." : ""}`);
  };

  if (status !== "authenticated") {
    return (
      <div className="pixel-border p-4 bg-white">
        <h2 className="h5 mb-3">ยินดีต้อนรับ</h2>
        <p className="mb-3">กรุณาเข้าสู่ระบบก่อนใช้งานการวิเคราะห์ด้วย AI</p>
        <button className="btn btn-primary btn-pixel" onClick={() => signIn("google")}>
          เข้าสู่ระบบ
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="pixel-border pixel-bg p-4 bg-white mb-4">
        <h2 className="h5 mb-3">ส่งข้อความให้ AI วิเคราะห์</h2>
        <textarea
          className="form-control textarea-pixel mb-3"
          rows={5}
          placeholder="พิมพ์หรือกดปุ่มพูดเพื่อใส่ข้อความ..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="d-flex gap-2">
          <button className="btn btn-success btn-pixel" onClick={analyze}>
            วิเคราะห์
          </button>
          <VoiceButton onText={(t) => setText((prev) => (prev ? prev + " " : "") + t)} />
          <button className="btn btn-outline-dark btn-pixel" onClick={() => setText("")}>
            ล้าง
          </button>
        </div>
      </div>

      {result && (
        <div className="pixel-border p-4 bg-white">
          <h3 className="h6 mb-2">ผลการวิเคราะห์</h3>
          <div>{result}</div>
        </div>
      )}
    </>
  );
}
