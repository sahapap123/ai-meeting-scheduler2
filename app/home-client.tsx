// app/home-client.tsx
'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import VoiceButton from "@/components/VoiceButton";

export default function HomeClient() {
  const { data: session } = useSession();
  const [prompt, setPrompt] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/get-events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (session) fetchEvents(); }, [session]);

  const handleCreate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const res = await fetch('/api/create-event', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        setPrompt('');
        fetchEvents(); // ดึงข้อมูลใหม่มาโชว์ทันที
      } else {
        const msg = await res.text();
        alert("พังครับ: " + msg);
      }
    } catch (err) { alert("เชื่อมต่อล้มเหลว"); }
    finally { setLoading(false); }
  };

  if (!session) return (
    <div className="cyber-card justify-content-center text-center">
      <div className="logo-glow-container mx-auto">
        <Image src="/icon.png" alt="Logo" width={70} height={70} />
      </div>
      <h1 className="pixel-font mb-4">AI Scheduler</h1>
      <button className="cyber-btn-primary w-100" onClick={() => signIn('google')}>Login with Google</button>
    </div>
  );

  return (
    <div className="cyber-card d-flex flex-column" style={{ minHeight: '80vh' }}>
      {/* ส่วนหัว */}
      <div className="d-flex justify-content-between mb-4">
        <span className="pixel-font" style={{color:'var(--neon-cyan, #00f3ff)'}}>AI MS v1.0</span>
        <button className="btn btn-sm btn-outline-light" onClick={() => signOut()}>Logout</button>
      </div>
      
      <h2 className="pixel-font text-center mb-4" style={{fontSize:'1.2rem', letterSpacing: '2px'}}>MY SCHEDULE</h2>
      
      {/* ส่วนกรอกข้อมูล */}
      <div className="mb-4">
        <div className="cyber-input-group d-flex">
          <input 
            className="cyber-input flex-grow-1" 
            value={prompt} 
            onChange={(e)=>setPrompt(e.target.value)} 
            placeholder="พิมพ์นัดหมาย..." 
            disabled={loading}
          />
          <div className="mx-2">
            <VoiceButton onTranscript={(t)=>setPrompt(t)} />
          </div>
          <button className="cyber-btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? '...' : 'สร้าง'}
          </button>
        </div>
      </div>

      {/* ส่วนแสดงตารางนัดหมาย (ออกแบบใหม่) */}
      <div className="flex-grow-1 overflow-auto mt-2">
        <h6 className="mb-3" style={{ color: 'var(--text-dim, #8892b0)', fontSize: '0.9rem' }}>รายการนัดหมายของคุณ:</h6>
        
        {events.length > 0 ? events.map((ev, i) => {
          // จัดฟอร์แมตวันที่และเวลาให้อ่านง่าย
          const dateObj = new Date(ev.start.dateTime || ev.start.date);
          const timeStr = dateObj.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'});
          const dateStr = dateObj.toLocaleDateString('th-TH', {day: 'numeric', month: 'short'});

          return (
            <div key={i} className="d-flex align-items-center mb-3 p-3" style={{
              backgroundColor: 'rgba(20, 20, 35, 0.6)',
              border: '1px solid rgba(0, 243, 255, 0.2)',
              borderLeft: '4px solid var(--neon-cyan, #00f3ff)',
              borderRadius: '8px',
              transition: 'all 0.3s ease'
            }}>
              {/* กล่องเวลาด้านซ้าย */}
              <div className="text-center me-3" style={{ minWidth: '70px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#8892b0' }}>{dateStr}</div>
                <div style={{ color: 'var(--neon-cyan, #00f3ff)', fontWeight: 'bold', fontSize: '1.1rem' }}>{timeStr}</div>
              </div>
              
              {/* ชื่อตารางด้านขวา */}
              <div className="text-light text-truncate" style={{ fontSize: '1rem' }}>
                {ev.summary}
              </div>
            </div>
          );
        }) : (
          <div className="text-center p-4 mt-4" style={{ border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px' }}>
            <p className="mb-0" style={{ color: '#8892b0' }}>ไม่มีนัดหมายในระบบ</p>
          </div>
        )}
      </div>
    </div>
  );
}