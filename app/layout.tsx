// app/layout.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Bootstrap + Pixel Demo',
  description: 'Next.js App Router with Bootstrap and Pixel style',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-body-tertiary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
