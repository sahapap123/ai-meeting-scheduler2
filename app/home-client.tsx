"use client";
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import VoiceButton from "@/components/VoiceButton";

export default function HomeClient() {
  const { status } = useSession();
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "analyze_failed");
      setResult(data.result);
    } catch (e: any) {
      setErr(e?.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  if (status !== "authenticated") {
    return (
      <div className="pixel-border p-4 bg-white">
        <h2 className="h5 mb-3">ยินดีต้อนรับ</h2>
        <p className="mb-3">กรุณาเข้าสู่ระบบก่อนใช้งานการวิเคราะห์ด้วย AI</p>
        <button className="btn btn-primary btn-pixel" onClick={() => signIn("google", { callbackUrl: "/" })}>
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
        <div className="d-flex gap-2 align-items-center">
          <button className="btn btn-success btn-pixel" onClick={analyze} disabled={loading}>
            {loading ? "กำลังวิเคราะห์..." : "วิเคราะห์"}
          </button>
          <VoiceButton onText={(t) => setText((p) => (p ? p + " " : "") + t)} />
          <button className="btn btn-outline-dark btn-pixel" onClick={() => setText("")} disabled={loading}>
            ล้าง
          </button>
        </div>
        {err && <div className="alert alert-danger mt-3 mb-0">{err}</div>}
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
