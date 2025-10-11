// app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';

// สร้าง Component สำหรับห่อหุ้ม SessionProvider
export default function NextAuthProviders({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}