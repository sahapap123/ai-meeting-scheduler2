// app/home-client.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import VoiceButton from "@/components/VoiceButton";

export default function HomeClient() {
  const { data: session } = useSession();
  const [prompt, setPrompt] = useState('');
  const [events, setEvents] = useState<any[]>([]); // เก็บข้อมูลจริงจาก Google
  const [loading, setLoading] = useState(false);

  // 1. ฟังก์ชันดึงข้อมูลตารางนัดหมายจาก Google Calendar
  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/get-events'); // ต้องมี API route นี้
      const data = await res.json();
      if (data.events) setEvents(data.events);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // ดึงข้อมูลทันทีที่ล็อกอินเสร็จ
  useEffect(() => {
    if (session) fetchEvents();
  }, [session]);

  // 2. ฟังก์ชันส่งคำสั่งสร้างนัดหมาย (เชื่อมต่อกับปุ่มสร้าง)
  const handleCreate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const res = await fetch('/api/create-event', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      
      if (res.ok) {
        setPrompt(''); // ล้างช่องพิมพ์
        fetchEvents(); // รีเฟรชตารางข้างล่างเพื่อโชว์งานใหม่
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการสร้างนัดหมาย");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="cyber-card justify-content-center text-center">
        <div className="logo-glow-container">
          <Image src="/icon.png" alt="Logo" width={70} height={70} />
        </div>
        <h1 className="pixel-font mb-4" style={{fontSize: '1.5rem', color: 'var(--neon-cyan)'}}>AI Scheduler</h1>
        <button className="cyber-btn-primary w-100" onClick={() => signIn('google')}>Login with Google</button>
      </div>
    );
  }

  return (
    <div className="cyber-card">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <span className="pixel-font" style={{fontSize: '0.8rem', color: 'var(--neon-cyan)'}}>AI MS v1.0</span>
        <button className="btn btn-sm btn-outline-light" onClick={() => signOut()} style={{fontSize: '0.7rem'}}>Log out</button>
      </div>

      <div className="text-center mb-4">
         <div className="logo-glow-container mx-auto">
           <Image src="/icon.png" alt="Logo" width={70} height={70} />
         </div>
        <h2 className="pixel-font" style={{ color: 'var(--text-light)', fontSize: '1.2rem' }}>AI Scheduler</h2>
      </div>

      {/* ช่องกรอกข้อมูล + ปุ่มสร้างที่ทำงานจริง */}
      <div className="mb-4">
        <label className="form-label text-dim">ป้อนคำสั่งจัดตาราง...</label>
        <div className="cyber-input-group d-flex align-items-center">
          <input
            type="text"
            className="cyber-input"
            placeholder={loading ? "กำลังประมวลผล..." : "เช่น ประชุมพรุ่งนี้ 9 โมง..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />
          <div className="mx-2">
             <VoiceButton onTranscript={(text) => setPrompt(text)} />
          </div>
          {/* เชื่อมต่อ onClick กับฟังก์ชัน handleCreate */}
          <button 
            className="cyber-btn-primary" 
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? '...' : 'สร้าง'}
          </button>
        </div>
      </div>

      {/* รายการตารางที่ดึงมาจาก Google จริงๆ */}
      <div className="flex-grow-1">
        <h5 className="mb-3 text-light">ตารางเวลาของคุณ:</h5>
        {events.length > 0 ? (
          events.map((event, index) => (
            <div key={index} className="schedule-item">
              <span className="schedule-icon">📅</span>
              <span className="schedule-time">
                {new Date(event.start.dateTime || event.start.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
              <span className="text-truncate" style={{maxWidth: '200px'}}>{event.summary}</span>
            </div>
          ))
        ) : (
          <div className="text-center text-dim mt-5 p-4" style={{border: '1px dashed #2d2d44', borderRadius: '12px'}}>
            <p className="mb-0">ยังไม่มีนัดหมายในเร็วๆ นี้</p>
          </div>
        )}
      </div>
       <p className="text-center text-dim mt-auto pt-4" style={{fontSize: '0.7rem'}}>Connected to Google Calendar API</p>
    </div>
  );
}