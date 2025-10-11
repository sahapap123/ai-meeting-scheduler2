// app/login/page.tsx
'use client';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-100">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center">
            <span role="img" aria-label="robot" className="mr-2">🤖</span> AI Meeting Scheduler
          </CardTitle>
          <CardDescription className="pt-2">กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google ของคุณ</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full font-semibold" 
            onClick={() => signIn('google', { callbackUrl: '/' })}
          >
            <Chrome className="mr-2 h-4 w-4"/> Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}