// app/layout.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import Providers from './providers';

export const metadata = {
  title: "AI Scheduler",
  icons: { icon: '/icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-dark">
        <Providers>
          {/* ลบ NavBar ออกไปแล้ว จะไม่มีแถบขาวแน่นอนครับ */}
          <main className="w-100 min-vh-100">{children}</main>
        </Providers>
      </body>
    </html>
  );
}