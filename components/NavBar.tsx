// components/NavBar.tsx
"use client";
import { useSession, signIn, signOut } from "next-auth/react";

export default function NavBar() {
  const { data: session, status } = useSession();

  return (
    <nav className="navbar bg-white mb-4">
      <div className="container d-flex justify-content-between align-items-center">
        <span className="navbar-brand pixel-border px-2 d-inline-block">My Brand</span>

        <div className="d-flex align-items-center gap-2">
          {status === "authenticated" ? (
            <>
              <span className="me-2">สวัสดี, {session?.user?.name ?? "ผู้ใช้"}</span>
              <button className="btn btn-dark btn-sm btn-pixel" onClick={() => signOut()}>
                ออกจากระบบ
              </button>
            </>
          ) : (
            // ลบปุ่มเข้าสู่ระบบตรงนี้ออก แล้วใส่ null แทน
            null
          )}
        </div>
      </div>
    </nav>
  );
}