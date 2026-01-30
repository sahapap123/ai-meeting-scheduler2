// app/home-client.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';
import Image from 'next/image';
import VoiceButton from "@/components/VoiceButton"; // <--- นำเข้ากลับมาแล้วครับ

export default function HomeClient() {
  const { data: session } = useSession();
  const [prompt, setPrompt] = useState('');
  
  // ข้อมูลจำลองสำหรับแสดงผล (Mockup)
  const mockSchedule = [
    { time: '14:00', title: 'ประชุมทีม (ห้อง Zoom)', status: 'success' },
    { time: '17:00', title: 'ออกกำลังกาย (30 นาที)', status: 'pending' },
  ];

  if (!session) {
    return (
      <div className="cyber-card text-center">
        <div className="logo-glow-container">
          <Image src="/icon.png" alt="Logo" width={80} height={80} />
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
           <Image src="/icon.png" alt="Logo" width={80} height={80} />
         </div>
        <h2 className="pixel-font" style={{ color: 'var(--text-light)' }}>AI Scheduler</h2>
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
          
          {/* --- ปุ่มเสียงอยู่ตรงนี้ครับ --- */}
          <div className="mx-2">
             <VoiceButton onTranscript={(text) => setPrompt(text)} />
          </div>

          <button className="cyber-btn-primary">สร้าง</button>
        </div>
      </div>

      {/* รายการตาราง */}
      <div>
        <h5 className="mb-3 text-light">ตารางเวลาของคุณ:</h5>
        {mockSchedule.map((item, index) => (
          <div key={index} className={`schedule-item ${item.status}`}>
            <span className="schedule-icon">
              {item.status === 'success' ? '✅' : '🕒'}
            </span>
            <span className="schedule-time">{item.time}</span>
            <span>{item.title}</span>
          </div>
        ))}
      </div>
       <p className="text-center text-dim mt-4" style={{fontSize: '0.7rem'}}>Next.js App Router with Cyberpunk style</p>
    </div>
  );
}