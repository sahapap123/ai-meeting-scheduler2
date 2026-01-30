// components/VoiceButton.tsx
'use client';

import { useState, useEffect } from 'react';

// กำหนดว่าปุ่มนี้รับค่าฟังก์ชัน onTranscript ได้
interface VoiceButtonProps {
  onTranscript: (text: string) => void;
}

export default function VoiceButton({ onTranscript }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // เช็กว่าเบราว์เซอร์รองรับการสั่งงานด้วยเสียงไหม
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setIsSupported(true);
    }
  }, []);

  const startListening = () => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'th-TH'; // ตั้งค่าภาษาไทย
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript); // ส่งข้อความที่พูดได้กลับไปหน้าหลัก
    };

    recognition.start();
  };

  if (!isSupported) return null; // ถ้าไม่รองรับ ไม่ต้องโชว์ปุ่ม

  return (
    <button
      onClick={startListening}
      className="btn ms-2"
      style={{
        backgroundColor: isListening ? '#ff007a' : 'transparent', // สีชมพูตอนฟัง
        border: '2px solid #00f3ff', // ขอบสีฟ้า Cyber
        color: isListening ? 'white' : '#00f3ff',
        borderRadius: '50%',
        width: '45px',
        height: '45px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: isListening ? '0 0 15px #ff007a' : 'none',
        transition: 'all 0.3s ease'
      }}
      title="กดเพื่อพูด"
    >
      {isListening ? '🛑' : '🎤'}
    </button>
  );
}