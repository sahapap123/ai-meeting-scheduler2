// app/page.tsx
'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Scheduler from '@/components/Scheduler'; // นำเข้า Component หลัก
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // ถ้ายังไม่ได้ล็อกอิน ให้พาไปหน้า login
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // ขณะกำลังโหลดข้อมูล session
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="mt-4 text-gray-600">กำลังตรวจสอบสถานะ...</p>
      </div>
    );
  }

  // ถ้าล็อกอินแล้ว ให้แสดงหน้า Scheduler
  if (status === 'authenticated') {
    return <Scheduler session={session} />;
  }

  // Fallback (ปกติจะไม่เห็นหน้านี้)
  return null;
}