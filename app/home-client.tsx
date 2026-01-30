// app/home-client.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';
import Image from 'next/image';
import VoiceButton from "@/components/VoiceButton";

export default function HomeClient() {
  const { data: session } = useSession();
  const [prompt, setPrompt] = useState('');
  
  // --- ลบข้อมูลจำลอง (mockSchedule) ออกแล้วครับ ---

  if (!session) {
    // หน้าล็อกอิน: จัดให้อยู่ตรงกลางจอ
    return (
      <div className="cyber-card justify-content-center text-center">
        <div className="logo-glow-container">
          <Image src="/icon.png" alt="Logo" width={70} height={70} />
        </div>
        <h1 className="pixel-font mb-4" style={{fontSize: '1.5rem', color: 'var(--neon-cyan)'}}>
          AI Scheduler
        </h1>
        <p className="text-dim mb-4">กรุณาเข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
        <button className="cyber-btn-primary w-100" onClick={() => signIn('google')}>
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    );
  }

  // หน้าหลัก: ขยายเต็มจอ
  return (
    <div className="cyber-card">
      {/* ส่วนหัว */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <span className="pixel-font" style={{fontSize: '0.8rem', color: 'var(--neon-cyan)'}}>AI MS v1.0</span>
         <button className="btn btn-sm btn-outline-light" onClick={() => signOut()} style={{fontSize: '0.7rem'}}>Log out</button>
      </div>

      {/* โลโก้ */}
      <div className="text-center mb-4">
         <div className="logo-glow-container mx-auto">
           <Image src="/icon.png" alt="Logo" width={70} height={70} />
         </div>
        <h2 className="pixel-font" style={{ color: 'var(--text-light)', fontSize: '1.2rem' }}>AI Scheduler</h2>
      </div>

      {/* ช่องกรอกข้อมูล + ปุ่มเสียง */}
      <div className="mb-4">
        <label className="form-label text-dim">ป้อนคำสั่งจัดตาราง...</label>
        <div className="cyber-input-group d-flex align-items-center">
          <input
            type="text"
            className="cyber-input"
            placeholder="เช่น ประชุมทีมพรุ่งนี้บ่ายสอง..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="mx-2">
             <VoiceButton onTranscript={(text) => setPrompt(text)} />
          </div>
          <button className="cyber-btn-primary">สร้าง</button>
        </div>
      </div>

      {/* รายการตาราง (แสดงข้อความว่างเปล่าแทน) */}
      <div className="flex-grow-1 d-flex flex-column justify-content-start">
        <h5 className="mb-3 text-light">ตารางเวลาของคุณ:</h5>
        
        {/* --- แสดงข้อความนี้แทนรายการตัวอย่าง --- */}
        <div className="text-center text-dim mt-5 p-4" style={{border: '1px dashed #2d2d44', borderRadius: '12px'}}>
            <p className="mb-0">ยังไม่มีรายการนัดหมาย</p>
            <small>พิมพ์คำสั่งหรือกดปุ่มไมค์เพื่อเริ่มสร้าง</small>
        </div>

      </div>
       <p className="text-center text-dim mt-auto pt-4" style={{fontSize: '0.7rem'}}>Next.js App Router with Cyberpunk style</p>
    </div>
  );
}