// app/login/page.tsx
"use client";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  return (
    <main className="container py-5">
      <div className="pixel-border p-4 bg-white">
        <h1 className="h4 mb-3">เข้าสู่ระบบ</h1>
        <p className="text-muted mb-4">ล็อกอินด้วย Google เพื่อใช้งานระบบ</p>
        <button
          className="btn btn-primary btn-lg btn-pixel"
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    </main>
  );
}
