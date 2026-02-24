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
  const [aiLog, setAiLog] = useState<string>('> SYSTEM ONLINE. AWAITING COMMAND...');
  
  // 🌟 State สำหรับระบบ Theme (เริ่มต้นเป็นโหมด Dark)
  const [isDark, setIsDark] = useState(true);

  // เปลี่ยนสีพื้นหลังของทั้งหน้าเว็บ (Body) แบบ Real-time
  useEffect(() => {
    document.body.style.backgroundColor = isDark ? '#121212' : '#e9ecef';
    document.body.style.transition = 'background-color 0.5s ease';
  }, [isDark]);

  const fetchEvents = async () => {
    try {
      setAiLog('> SYNCING WITH GOOGLE CALENDAR...');
      const res = await fetch('/api/get-events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setAiLog('> SYNC COMPLETE. READY.');
      }
    } catch (err) { setAiLog('> ERROR: CONNECTION LOST'); }
  };

  useEffect(() => { if (session) fetchEvents(); }, [session]);

  const handleCreate = async () => {
    if (!prompt) {
      setAiLog('> ERROR: EMPTY COMMAND DETECTED.');
      return;
    }
    setLoading(true);
    setAiLog(`> ANALYZING DATA: "${prompt}"...`);
    
    try {
      const res = await fetch('/api/create-event', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        setAiLog('> TARGET ACQUIRED. INJECTING TO CALENDAR...');
        setPrompt('');
        setTimeout(() => fetchEvents(), 800);
      } else {
        const msg = await res.text();
        setAiLog(`> SYSTEM OVERRIDE FAILED: ${msg}`);
      }
    } catch (err) { setAiLog("> CRITICAL ERROR: AI CORE UNREACHABLE."); } 
    finally { setLoading(false); }
  };

  // 🌟 ชุดสีอัจฉริยะ (สลับตามโหมด)
  const theme = {
    cardBg: isDark ? 'rgba(15, 15, 25, 0.85)' : '#ffffff',
    textMain: isDark ? '#ffffff' : '#333333',
    textDim: isDark ? '#8892b0' : '#6c757d',
    accent: isDark ? '#00f3ff' : '#0056b3', // ฟ้าไซเบอร์ vs น้ำเงินเข้ม
    terminalBg: isDark ? '#05050a' : '#f4f7f6',
    terminalText: isDark ? '#00ff41' : '#0066cc',
    terminalBorder: isDark ? 'rgba(0, 255, 65, 0.4)' : 'rgba(0, 102, 204, 0.4)',
    eventBg: isDark ? 'rgba(20, 20, 35, 0.6)' : '#f8f9fa',
    eventBorder: isDark ? 'rgba(0, 243, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    inputBg: isDark ? 'transparent' : '#ffffff',
  };

  if (!session) return (
    <div className="cyber-card justify-content-center text-center" style={{ backgroundColor: theme.cardBg, color: theme.textMain, transition: 'all 0.4s' }}>
      <div className="logo-glow-container mx-auto">
        <Image src="/icon.png" alt="Logo" width={70} height={70} />
      </div>
      <h1 className="pixel-font mb-4">AI Scheduler</h1>
      <button className="cyber-btn-primary w-100" onClick={() => signIn('google')}>Login with Google</button>
    </div>
  );

  return (
    <div className="cyber-card d-flex flex-column" style={{ 
      minHeight: '80vh', 
      backgroundColor: theme.cardBg, 
      transition: 'all 0.4s ease',
      boxShadow: isDark ? '0 0 20px rgba(0,243,255,0.1)' : '0 10px 30px rgba(0,0,0,0.1)'
    }}>
      {/* ส่วนหัว + ปุ่มสลับธีม */}
      <div className="d-flex justify-content-between mb-4 align-items-center">
        <span className="pixel-font" style={{ color: theme.accent, textShadow: isDark ? '0 0 5px #00f3ff' : 'none' }}>NEURAL_LINK_v1.0</span>
        
        <div>
          {/* ปุ่มสลับโหมด */}
          <button 
            className="btn btn-sm me-2" 
            onClick={() => setIsDark(!isDark)}
            style={{ backgroundColor: isDark ? '#333' : '#f0f0f0', color: isDark ? '#ffcc00' : '#333', borderRadius: '20px' }}
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
          
          <button className="btn btn-sm btn-outline-danger" style={{borderRadius: '4px'}} onClick={() => signOut()}>DISCONNECT</button>
        </div>
      </div>
      
      {/* หน้าจอ AI Terminal */}
      <div className="mb-4 p-3" style={{
        backgroundColor: theme.terminalBg,
        border: `1px solid ${theme.terminalBorder}`,
        borderLeft: `4px solid ${isDark ? '#00ff41' : '#0066cc'}`,
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
        color: theme.terminalText,
        textShadow: isDark ? '0 0 5px rgba(0, 255, 65, 0.5)' : 'none',
        transition: 'all 0.4s ease'
      }}>
        <span style={{ animation: 'blink 1s step-end infinite' }}>█</span> {aiLog}
      </div>

      {/* ส่วนกรอกข้อมูล */}
      <div className="mb-4">
        <div className="cyber-input-group d-flex" style={{ position: 'relative' }}>
          <input 
            className="cyber-input flex-grow-1" 
            value={prompt} 
            onChange={(e) => {
              setPrompt(e.target.value);
              if (e.target.value.length > 0 && aiLog === '> SYNC COMPLETE. READY.') {
                setAiLog('> DETECTING KEYSTROKES...');
              }
            }} 
            placeholder="ป้อนคำสั่ง (เช่น: พรุ่งนี้ประชุม 9 โมง)..." 
            disabled={loading}
            style={{ 
              backgroundColor: theme.inputBg,
              color: theme.textMain,
              border: `1px solid ${isDark ? '#00f3ff' : '#ccc'}`,
              transition: 'all 0.3s'
            }}
          />
          <div className="mx-2">
            <VoiceButton onTranscript={(t) => {
              setPrompt(t);
              setAiLog(`> VOICE CAPTURED: PROCESSING...`);
            }} />
          </div>
          <button 
            className="cyber-btn-primary" 
            onClick={handleCreate} 
            disabled={loading}
            style={{ minWidth: '80px', backgroundColor: isDark ? '' : '#0056b3', color: 'white' }}
          >
            {loading ? <span className="spinner-border spinner-border-sm" role="status"></span> : 'EXECUTE'}
          </button>
        </div>
      </div>

      {/* ส่วนแสดงตารางนัดหมาย */}
      <div className="flex-grow-1 overflow-auto mt-2">
        <h6 className="mb-3" style={{ color: theme.textDim, fontSize: '0.8rem', letterSpacing: '1px' }}>/// SCHEDULE_DATABASE:</h6>
        
        {events.length > 0 ? events.map((ev, i) => {
          const dateObj = new Date(ev.start.dateTime || ev.start.date);
          const timeStr = dateObj.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'});
          const dateStr = dateObj.toLocaleDateString('th-TH', {day: 'numeric', month: 'short'});

          return (
            <div key={i} className="d-flex align-items-center mb-3 p-3" style={{
              backgroundColor: theme.eventBg,
              border: `1px solid ${theme.eventBorder}`,
              borderLeft: `4px solid ${theme.accent}`,
              borderRadius: '8px',
              transition: 'all 0.3s ease'
            }}>
              <div className="text-center me-3" style={{ minWidth: '70px', borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, paddingRight: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: theme.textDim }}>{dateStr}</div>
                <div style={{ color: theme.accent, fontWeight: 'bold', fontSize: '1.1rem' }}>{timeStr}</div>
              </div>
              <div className="text-truncate" style={{ fontSize: '1rem', color: theme.textMain }}>
                {ev.summary}
              </div>
            </div>
          );
        }) : (
          <div className="text-center p-4 mt-4" style={{ border: `1px dashed ${theme.textDim}`, borderRadius: '8px' }}>
            <p className="mb-0" style={{ color: theme.textDim, fontFamily: 'monospace' }}>[ NO_DATA_FOUND ]</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `@keyframes blink { 50% { opacity: 0; } }`}} />
    </div>
  );
}