// app/layout.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import Providers from './providers';
import { Metadata } from 'next';
// import NavBar from '@/components/ui/NavBar'; // <--- ลบบรรทัดนี้ทิ้ง หรือ comment ไว้

export const metadata: Metadata = {
  title: "AI Scheduler",
  description: "Your personal AI assistant for scheduling",
  icons: { icon: '/icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      {/* ลบ class จัดกึ่งกลางออก เพื่อให้ขยายเต็มที่ */}
      <body className="w-100 min-vh-100 bg-dark">
        <Providers>
          {/* <NavBar />  <--- เอาแถบขาวออกตรงนี้ */}
          <main className="w-100 h-100">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}