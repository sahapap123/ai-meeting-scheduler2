// app/layout.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'AI MS',
  description: 'Next.js App Router with Bootstrap and Pixel style',
};

// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-dark text-light">
        <div className="container-fluid min-vh-100 d-flex flex-column align-items-center py-4">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
