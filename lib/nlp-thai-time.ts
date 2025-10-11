// lib/nlp-thai-time.ts
// พาร์เซอร์ไทยแบบเบาๆ สำหรับ "วันนี้/พรุ่งนี้/คืนนี้", X ทุ่ม, X โมงเช้า/เย็น, บ่าย X, เที่ยง, เที่ยงคืน, ครึ่ง, และ "ถึง"
const TZ = "Asia/Bangkok";

function toDateInTz(d: Date, y: number, m: number, day: number, h: number, min: number) {
  // ใช้ local time ของ server แล้ว set ตามเลข (ถือว่า deploy/ENV เป็น Asia/Bangkok)
  const dt = new Date(d);
  dt.setFullYear(y, m, day);
  dt.setHours(h, min, 0, 0);
  return dt;
}

type Parsed = {
  summary?: string;
  start?: Date;
  end?: Date;
  confidence: number; // 0..1
};

export function parseThaiTime(input: string, now = new Date()): Parsed {
  const text = input.trim().replace(/\s+/g, " ");
  const lower = text;

  let base = new Date(now);
  // คำบอกวัน
  if (/(พรุ่งนี้)/.test(lower)) {
    base = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  } else if (/(วันนี้)/.test(lower)) {
    // คงวันนี้
  } else if (/(คืนนี้)/.test(lower)) {
    // คืนนี้ยังเป็นวันนี้ แต่หากตีความเที่ยงคืนให้ +1 วัน
  }

  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();

  let h: number | undefined;
  let min = 0;

  // เที่ยง / เที่ยงคืน
  if (/เที่ยงคืน/.test(lower)) {
    h = 0;
  } else if (/เที่ยง(?!คืน)/.test(lower)) {
    h = 12;
  }

  // บ่าย X (13–16)
  let m1 = lower.match(/บ่าย\s*(\d{1,2})(?:\.(\d{1,2})|:(\d{2}))?/);
  if (m1) {
    const num = parseInt(m1[1], 10);
    const mm = parseInt(m1[2] || m1[3] || "0", 10) || 0;
    if (num >= 1 && num <= 4) {
      h = 12 + num;
      min = mm;
    }
  }

  // X ทุ่ม (+18)
  let m2 = lower.match(/(\d{1,2})\s*ทุ่ม(ครึ่ง)?/);
  if (m2) {
    const num = parseInt(m2[1], 10);
    if (num >= 1 && num <= 5) {
      h = 18 + num; // 1ทุ่ม=19
      min = m2[2] ? 30 : 0;
    } else if (num === 6) {
      h = 0; // 6 ทุ่ม ~ 24:00 (ตีความเป็น 00:00 วันถัดไป)
    }
  }

  // X โมงเช้า (6–11), X โมงเย็น (17–18), X โมง (กำกวม: ถ้ามีเช้า/เย็นคำนวณ, ถ้าไม่มีจะไม่แตะ)
  let m3 = lower.match(/(\d{1,2})\s*โมง(เช้า|เย็น)?(ครึ่ง)?/);
  if (m3) {
    const num = parseInt(m3[1], 10);
    const part = m3[2];
    const half = !!m3[3];
    if (part === "เช้า") {
      if (num >= 6 && num <= 11) {
        h = num;
        min = half ? 30 : 0;
      }
    } else if (part === "เย็น") {
      // เย็นไทยนิยม 5-6 โมง = 17–18
      if (num === 5) h = 17;
      else if (num === 6) h = 18;
      if (h !== undefined) min = half ? 30 : 0;
    }
  }

  // รูปแบบ “HH:MM” หรือ “HH.MM”
  let m4 = lower.match(/(\d{1,2})[:\.](\d{2})/);
  if (m4) {
    const hh = parseInt(m4[1], 10);
    const mm = parseInt(m4[2], 10);
    if (h === undefined) {
      h = hh;
      min = mm;
    }
  }

  // ถ้าไม่มีโมง/ทุ่ม แต่มี “2 ทุ่ม” รูปแบบใช้ได้แล้ว; “คืนนี้” + เที่ยงคืน ให้เลื่อนไปวันถัดไป
  let start: Date | undefined;
  if (h !== undefined) {
    start = toDateInTz(base, y, m, d, h, min);
    if (/คืนนี้/.test(lower) && /เที่ยงคืน/.test(lower)) {
      // คืนนี้เที่ยงคืน -> 00:00 ของวันถัดไป
      start = toDateInTz(base, y, m, d + 1, 0, 0);
    }
  }

  // ช่วงเวลา “...ถึง ...”
  let end: Date | undefined;
  let to = lower.match(/ถึง\s*(.+)$/);
  if (to && start) {
    const rhs = to[1];
    // รองรับ “1 ทุ่ม/19:30/บ่ายสอง/หกโมงเย็น/ครึ่ง”
    let tmp = parseThaiTime(rhs, start);
    if (tmp.start) end = tmp.start;
  }

  // default ระยะเวลา 1 ชม. ถ้ายังไม่มี end
  if (start && !end) {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }

  const confidence = start ? 0.9 : 0.2;
  return { summary: input, start, end, confidence };
}
