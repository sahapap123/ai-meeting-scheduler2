"use client";
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import VoiceButton from "@/components/VoiceButton";

type CreateResp = { ok?: boolean; event?: any; ai?: any; error?: string; detail?: any };

export default function HomeClient() {
  const { status } = useSession();
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createdMsg, setCreatedMsg] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true); setErr(null); setResult(null);
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const raw = await r.text();
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { data = { error: "non_json_response", detail: raw }; }
      if (!r.ok) throw new Error(data?.error || `HTTP_${r.status}`);
      setResult(data?.result ?? "(ไม่มีผลลัพธ์)");
    } catch (e: any) {
      setErr(e?.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!text.trim()) return;
    setCreating(true); setCreateErr(null); setCreatedMsg(null);
    try {
      const r = await fetch("/api/auth/calendar/quick", { // ✅ ใช้ API ที่คุณมีอยู่แล้ว
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const raw = await r.text();
      let data: CreateResp = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: "non_json_response", detail: raw }; }

      if (!r.ok || !data.ok) {
        // เงื่อนไขพบบ่อย
        if (r.status === 401) throw new Error("ยังไม่ได้ล็อกอิน/โทเค็นหมดอายุ (ลองออกแล้วล็อกอินใหม่)");
        if (data.error === "google_error") throw new Error("Google ปฏิเสธสิทธิ์ (ลองออกแล้วล็อกอินใหม่เพื่อให้สิทธิ์ calendar.events)");
        throw new Error(data.error || `HTTP_${r.status}`);
      }

      const ev = data.event || {};
      const link = ev.htmlLink || ev.html || null;
      const when =
        (ev.start?.dateTime || ev.start?.date || ev.start) +
        (ev.end ? ` → ${ev.end?.dateTime || ev.end?.date || ev.end}` : "");

      setCreatedMsg(
        link
          ? `สร้างอีเวนต์แล้ว: ${ev.summary || "นัดหมาย"} (${when}) — เปิดดู: `
          : `สร้างอีเวนต์แล้ว: ${ev.summary || "นัดหมาย"} (${when})`
      );

      // ถ้ามีลิงก์ ให้แสดงลิงก์แยกเป็น <a> ด้านล่าง
      if (link) {
        const a = document.createElement("a");
        a.href = link; a.target = "_blank"; a.rel = "noreferrer"; a.click();
      }
    } catch (e: any) {
      setCreateErr(e?.message ?? "สร้างอีเวนต์ไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  };

  if (status !== "authenticated") {
    return (
      <div className="pixel-border p-4 bg-white">
        <h2 className="h5 mb-3">ยินดีต้อนรับ</h2>
        <p className="mb-3">กรุณาเข้าสู่ระบบก่อนใช้งาน</p>
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
          placeholder="เช่น พรุ่งนี้ 10:00 ประชุมทีม / วันที่ 13 10 โมง"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="d-flex gap-2 align-items-center">
          <button className="btn btn-success btn-pixel" onClick={analyze} disabled={loading || creating}>
            {loading ? "กำลังวิเคราะห์..." : "วิเคราะห์"}
          </button>
          <VoiceButton onText={(t) => setText((p) => (p ? p + " " : "") + t)} />
          <button className="btn btn-outline-dark btn-pixel" onClick={() => setText("")} disabled={loading || creating}>
            ล้าง
          </button>
          <button className="btn btn-secondary btn-pixel" onClick={createEvent} disabled={creating || loading}>
            {creating ? "กำลังสร้าง..." : "สร้าง"}
          </button>
        </div>
        {err && <div className="alert alert-danger mt-3 mb-0">{err}</div>}
      </div>

      {result && (
        <div className="pixel-border p-4 bg-white mb-4">
          <h3 className="h6 mb-2">ผลการวิเคราะห์</h3>
          <div>{result}</div>
        </div>
      )}

      {createdMsg && (
        <div className="pixel-border p-4 bg-white">
          <h3 className="h6 mb-2">สร้างอีเวนต์</h3>
          <div>{createdMsg}</div>
        </div>
      )}

      {createErr && (
        <div className="pixel-border p-4 bg-white">
          <div className="alert alert-danger mb-0">สร้างอีเวนต์ไม่สำเร็จ: {createErr}</div>
        </div>
      )}
    </>
  );
}
