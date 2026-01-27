// app/privacy/page.tsx
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="container py-5">
      <div className="pixel-border p-4 bg-white">
        <h1 className="h2 mb-4">นโยบายความเป็นส่วนตัว (Privacy Policy)</h1>
        <p className="text-muted small">อัปเดตล่าสุดเมื่อ: 27 มกราคม 2026</p>
        <hr />

        <section className="mb-4">
          <h2 className="h5">1. ข้อมูลที่เราเก็บรวบรวม</h2>
          <ul>
            <li>ข้อมูลบัญชี Google พื้นฐาน: ชื่อ, อีเมล และรูปโปรไฟล์</li>
            <li>ข้อมูลปฏิทิน (Google Calendar): เพื่อใช้อ่านและสร้างนัดหมาย</li>
            <li>ข้อมูลที่คุณป้อน: ข้อความหรือเสียงเพื่อให้ AI วิเคราะห์</li>
          </ul>
        </section>

        <section className="mb-4">
          <h2 className="h5">2. วิธีที่เราใช้ข้อมูล</h2>
          <p>เราใช้ข้อมูลเพื่อวิเคราะห์คำสั่งของคุณผ่าน AI และดำเนินการสร้างนัดหมายในปฏิทินของคุณเท่านั้น เราไม่มีนโยบายการขายข้อมูลส่วนบุคคลให้แก่บุคคลที่สาม</p>
        </section>

        <section className="mb-4">
          <h2 className="h5">3. การติดต่อเรา</h2>
          <p>หากมีข้อสงสัย โปรดติดต่อ: <strong>[SahapapButprasert@gmail.com]</strong></p>
        </section>

        <Link href="/" className="btn btn-dark btn-pixel mt-3">
          กลับหน้าหลัก
        </Link>
      </div>
    </main>
  );
}