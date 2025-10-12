// app/page.tsx
export default function Page() {
  return (
    <main className="container py-5">
      {/* วาง block นี้ */}
      <section className="py-5">  {/* ไม่ต้องซ้อน .container ซ้ำ */}
        <nav className="navbar bg-white mb-4">
          <div className="container">
            <a className="navbar-brand pixel-border px-2">My Brand</a>
          </div>
        </nav>

        <div className="pixel-border pixel-bg p-4 bg-white mb-4">
          เนื้อหาพื้นหลังลายตารางพิกเซล
        </div>
      </section>
    </main>
  );
}
