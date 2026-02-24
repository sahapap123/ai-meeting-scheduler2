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
        alert("✨ สร้างสำเร็จ!");
        fetchEvents();
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
    <div className="cyber-card">
      <div className="d-flex justify-content-between mb-4">
        <span className="pixel-font" style={{color:'var(--neon-cyan)'}}>AI MS v1.0</span>
        <button className="btn btn-sm btn-outline-light" onClick={() => signOut()}>Logout</button>
      </div>
      <h2 className="pixel-font text-center mb-4" style={{fontSize:'1.2rem'}}>MY SCHEDULE</h2>
      <div className="mb-4">
        <div className="cyber-input-group">
          <input className="cyber-input" value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder="พิมพ์นัดหมาย..." />
          <VoiceButton onTranscript={(t)=>setPrompt(t)} />
          <button className="cyber-btn-primary ms-2" onClick={handleCreate} disabled={loading}>{loading ? '...' : 'สร้าง'}</button>
        </div>
      </div>
      <div className="flex-grow-1">
        {events.length > 0 ? events.map((ev, i) => (
          <div key={i} className="schedule-item">
            <span className="schedule-time">{new Date(ev.start.dateTime || ev.start.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            <span>{ev.summary}</span>
          </div>
        )) : <p className="text-center text-dim mt-5">ไม่มีนัดหมาย</p>}
      </div>
    </div>
  );
}