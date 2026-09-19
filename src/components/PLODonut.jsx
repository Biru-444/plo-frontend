/**
 * ทำอะไร : วงแหวนแสดง % เป็น SVG (ไม่ใช้ library กราฟภายนอก) — ใช้ทั่วทั้งแอปทุกที่ที่ต้องแสดงตัวเลข
 *          % แบบวงกลม (dashboard hero, การ์ดสรุป PLO/YLO, การ์ดวิชาของอาจารย์ ฯลฯ)
 *
 * เชื่อมกับ : คำนวณความยาวส่วนโค้ง (strokeDasharray/strokeDashoffset) จากเส้นรอบวงคงที่ตาม SIZE/STROKE
 *             ที่กำหนดไว้ - ปรับขนาดจริงบนหน้าจอผ่าน prop `size` (viewBox คงที่ที่ SIZE เดิมเสมอ ทำให้
 *             สเกลได้โดยสัดส่วนไม่ผิดเพี้ยน)
 *
 * ถ้าแก้ : percent เป็น null/undefined = "ยังไม่มีข้อมูล" (วงแหวนสีเทา ไม่มีส่วนโค้งสี) คนละความหมาย
 *          กับ percent=0 (มีข้อมูลแล้วแต่ได้ 0%) — ห้ามส่ง 0 แทน null เด็ดขาด
 */
const SIZE = 44;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// color: ถ้าไม่ระบุ จะเลือกเขียว/แดงอัตโนมัติตาม threshold (pass/fail) - ระบุเองได้เมื่อค่านี้ไม่ใช่
// ตัวชี้วัด pass/fail (เช่น hero stat)
export default function PLODonut({ percent, threshold = 60, size = SIZE, color, hideLabel = false }) {
  const hasData = percent !== null && percent !== undefined;
  const clamped = hasData ? Math.max(0, Math.min(100, percent)) : 0;
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  const resolvedColor =
    color ||
    (!hasData ? "var(--color-gray-300)" : clamped >= threshold ? "var(--color-green-700)" : "var(--color-red-700)");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={hasData ? `${clamped.toFixed(1)}%` : "ยังไม่มีข้อมูล"}
    >
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-gray-100)" strokeWidth={STROKE} />
      {hasData && (
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={resolvedColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      )}
      {!hideLabel && (
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9}
          fontWeight="700"
          fill={hasData ? "var(--color-text)" : "var(--color-gray-400)"}
        >
          {hasData ? `${Math.round(clamped)}%` : "-"}
        </text>
      )}
    </svg>
  );
}
