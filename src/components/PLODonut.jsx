const SIZE = 44;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// null percent = "ยังไม่มีข้อมูล" - gray ring, no fill arc
// color: ถ้าไม่ระบุ จะเลือกเขียว/แดงอัตโนมัติตาม threshold (pass/fail) - ระบุเองได้เมื่อค่านี้ไม่ใช่ตัวชี้วัด pass/fail (เช่น hero stat)
export default function PLODonut({ percent, threshold = 60, size = SIZE, color }) {
  const hasData = percent !== null && percent !== undefined;
  const clamped = hasData ? Math.max(0, Math.min(100, percent)) : 0;
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  const resolvedColor =
    color || (!hasData ? "#d1d5db" : clamped >= threshold ? "var(--color-green-700)" : "var(--color-red-700)");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={hasData ? `${clamped.toFixed(1)}%` : "ยังไม่มีข้อมูล"}
    >
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#eef0f6" strokeWidth={STROKE} />
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
      <text
        x={SIZE / 2}
        y={SIZE / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={9}
        fontWeight="700"
        fill={hasData ? "var(--color-text)" : "#9ca3af"}
      >
        {hasData ? `${Math.round(clamped)}%` : "-"}
      </text>
    </svg>
  );
}
