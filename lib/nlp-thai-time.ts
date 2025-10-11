// lib/nlp-thai-time.ts
// พาร์เซอร์ไทยแบบเบา ๆ รองรับ: วันนี้/พรุ่งนี้/คืนนี้, X ทุ่ม (ตัวเลข, เลขไทย, คำไทย), X โมงเช้า/เย็น, บ่าย X,
// เที่ยง/เที่ยงคืน, ครึ่ง, ช่วง "...ถึง ..."
const TZ = "Asia/Bangkok";

const thaiDigitMap: Record<string, string> = {
  "๐": "0","๑": "1","๒": "2","๓": "3","๔": "4",
  "๕": "5","๖": "6","๗": "7","๘": "8","๙": "9",
};

const thaiWordNum: Array<[RegExp, number]> = [
  [/สิบสอง/g, 12],
  [/สิบเอ็ด/g, 11],
  [/สิบ/g, 10],
  [/เก้า/g, 9],
  [/แปด/g, 8],
  [/เจ็ด/g, 7],
  [/หก/g, 6],
  [/ห้า/g, 5],
  [/สี่/g, 4],
  [/สาม/g, 3],
  [/สอง/g, 2],
  [/หนึ่ง|นึง/g, 1],
  [/ศูนย์/g, 0],
];

// แปลงเลขไทย → อารบิก และคำไทย → ตัวเลข (สำหรับ pattern เฉพาะ)
function normalizeNumbers(s: string): string {
  // เลขไทยเป็นอารบิก
  s = s.replace(/[๐-๙]/g, ch => thaiDigitMap[ch] || ch);
  // ใส่ตัวคั่นก่อน "ทุ่ม/โมง" เพื่อจับเลขจากคำไทยได้ง่าย
  for (const [re, num] of thaiWordNum) {
    s = s.replace(re, String(num));
  }
  // จัดช่องว่างให้สม่ำเสมอ
  return s.replace(/\s+/g, " ").trim();
}

function localDate(y: number, m: number, d: number, hh: number, mm = 0) {
  const dt = new Date();
  dt.setFullYear(y, m, d);
  dt.setHours(hh, mm, 0, 0);
  return dt;
}

export type Parsed = { summary?: string; start?: Date; end?: Date; confidence: number };

export function parseThaiTime(input: string, now = new Date()): Parsed {
  let text = input.trim();
  const normalized = normalizeNumbers(text);

  // วันอ้างอิง
  let base = new Date(now);
  if (/(พรุ่งนี้)/.test(normalized)) base = new Date(base.getTime() + 86400000);
  // "คืนนี้" ใช้วันเดียวกัน แต่ถ้าระบุ "เที่ยงคืน" จะเลื่อนไปวันถัดไปด้านล่าง

  const y = base.getFullYear(), m = base.getMonth(), d = base.getDate();
  let h: number | undefined, min = 0;

  // เที่ยง/เที่ยงคืน
  if (/เที่ยงคืน/.test(normalized)) h = 0;
  else if (/เที่ยง(?!คืน)/.test(normalized)) h = 12;

  // บ่าย X (13–16)
  let m1 = normalized.match(/บ่าย\s*(\d{1,2})(?:\.(\d{1,2})|:(\d{2}))?/);
  if (m1) {
    const num = parseInt(m1[1], 10);
    const mm = parseInt(m1[2] || m1[3] || "0", 10) || 0;
    if (num >= 1 && num <= 4) { h = 12 + num; min = mm; }
  }

  // X ทุ่ม (1–5 → 19–23, 6 → 24:00)
  let m2 = normalized.match(/(\d{1,2})\s*ทุ่ม(ครึ่ง)?/);
  if (m2) {
    const num = parseInt(m2[1], 10);
    if (num >= 1 && num <= 5) { h = 18 + num; min = m2[2] ? 30 : 0; }
    else if (num === 6) { h = 0; /*ตีความเป็น 00:00 ของวันถัดไป*/ }
  }

  // X โมง(เช้า|เย็น)? (เช้า 6–11, เย็น 17–18)
  let m3 = normalized.match(/(\d{1,2})\s*โมง(เช้า|เย็น)?(ครึ่ง)?/);
  if (m3) {
    const num = parseInt(m3[1], 10);
    const part = m3[2]; const half = !!m3[3];
    if (part === "เช้า" && num >= 6 && num <= 11) { h = num; min = half ? 30 : 0; }
    if (part === "เย็น") {
      if (num === 5) h = 17;
      else if (num === 6) h = 18;
      if (h !== undefined) min = half ? 30 : 0;
    }
  }

  // HH:MM หรือ HH.MM (ถ้ายังไม่กำหนด h)
  let m4 = normalized.match(/(\d{1,2})[:\.](\d{2})/);
  if (m4 && h === undefined) {
    h = parseInt(m4[1], 10);
    min = parseInt(m4[2], 10);
  }

  let start: Date | undefined;
  if (h !== undefined) {
    start = localDate(y, m, d, h, min);
    if (/คืนนี้/.test(normalized) && /เที่ยงคืน/.test(normalized)) {
      start = localDate(y, m, d + 1, 0, 0);
    }
  }

  // "ถึง ..." ช่วงเวลา
  let end: Date | undefined;
  const to = normalized.match(/ถึง\s*(.+)$/);
  if (to && start) {
    const rhsParsed = parseThaiTime(to[1], start);
    if (rhsParsed.start) end = rhsParsed.start;
  }

  if (start && !end) end = new Date(start.getTime() + 60 * 60 * 1000); // default 1 ชม.

  return { summary: input, start, end, confidence: start ? 0.95 : 0.2 };
}
