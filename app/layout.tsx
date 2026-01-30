// app/layout.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import Providers from './providers';
import { Metadata } from 'next';

// เช็คดูว่าตรงนี้ไม่มี import NavBar แล้วนะครับ

export const metadata: Metadata = {
  title: "AI Scheduler",
  description: "Your personal AI assistant for scheduling",
  icons: { icon: '/icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="w-100 min-vh-100 bg-dark">
        <Providers>
          <main className="w-100 h-100">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}