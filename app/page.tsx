// app/page.tsx
import NavBar from "@/components/NavBar";
import HomeClient from "./home-client";   // ✅ ไม่ต้องใส่ "app/" ซ้ำ

export default function Page() {
  return (
    <main className="container py-4">
      <NavBar />
      <HomeClient />
    </main>
  );
}
