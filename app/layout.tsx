// app/layout.tsx
import 'bootstrap/dist/css/bootstrap.min.css'; // โหลด Bootstrap CSS ก่อน
import './globals.css';                        // แล้วค่อยโหลดสไตล์ของเรา

export const metadata = {
  title: 'Bootstrap + Pixel Demo',
  description: 'Next.js App Router with Bootstrap and Pixel style',
};
<section className="container py-5">
  <nav className="navbar bg-white mb-4">
    <div className="container">
      <a className="navbar-brand pixel-border px-2">My Brand</a>
    </div>
  </nav>

  <div className="pixel-border pixel-bg p-4 bg-white mb-4">
    เนื้อหาพื้นหลังลายตารางพิกเซล
  </div>
</section>

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="bg-body-tertiary">
        {children}
      </body>
    </html>
  );
}
