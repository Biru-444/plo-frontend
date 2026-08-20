import { useState } from "react";

const PASS_THRESHOLD = 60;
const SIZE = 360;
const CENTER = SIZE / 2;
const MAX_RADIUS = 130;
const LEVELS = [20, 40, 60, 80, 100];

// สีจาก validated palette (dataviz skill): series-1 blue, status good/critical
const COLOR_LINE = "#2a78d6";
const COLOR_FILL = "rgba(42, 120, 214, 0.18)";
const COLOR_GOOD = "#0ca30c";
const COLOR_CRITICAL = "#d03b3b";
const COLOR_GRID = "#e1e0d9";
const COLOR_AXIS = "#c3c2b7";
const COLOR_MUTED_TEXT = "#898781";
const COLOR_THRESHOLD_RING = "#52514e";

function pointFor(index, count, valuePercent) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  const r = (Math.max(0, Math.min(100, valuePercent)) / 100) * MAX_RADIUS;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

function labelPointFor(index, count) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  const r = MAX_RADIUS + 26;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

export default function PLORadarChart({ achievements }) {
  const [hovered, setHovered] = useState(null);
  const count = achievements.length;
  if (count < 3) return null; // radar ต้องมีอย่างน้อย 3 แกนถึงจะมีความหมาย

  const dataPoints = achievements.map((a, i) => pointFor(i, count, a.achieved_percent));
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="plo-radar-wrap">
      <svg width={SIZE} height={SIZE} role="img" aria-label="กราฟภาพรวมการบรรลุ PLO รายข้อ">
        {/* กริดวงแหวนระดับ 20/40/60/80/100 */}
        {LEVELS.map((level) => {
          const pts = achievements
            .map((_, i) => pointFor(i, count, level))
            .map((p) => `${p.x},${p.y}`)
            .join(" ");
          const isThreshold = level === PASS_THRESHOLD;
          return (
            <polygon
              key={level}
              points={pts}
              fill="none"
              stroke={isThreshold ? COLOR_THRESHOLD_RING : COLOR_GRID}
              strokeWidth={isThreshold ? 1.5 : 1}
              strokeDasharray={isThreshold ? "4 3" : undefined}
            />
          );
        })}

        {/* เส้นแกนจากจุดกึ่งกลางไปแต่ละ PLO */}
        {achievements.map((a, i) => {
          const p = pointFor(i, count, 100);
          return (
            <line
              key={a.plo_code}
              x1={CENTER}
              y1={CENTER}
              x2={p.x}
              y2={p.y}
              stroke={COLOR_AXIS}
              strokeWidth={1}
            />
          );
        })}

        {/* label เกณฑ์ผ่าน (ไม่พึ่งสีอย่างเดียว - มีตัวหนังสือกำกับ) */}
        <text
          x={CENTER}
          y={CENTER - MAX_RADIUS * (PASS_THRESHOLD / 100) - 6}
          fontSize="10"
          fill={COLOR_MUTED_TEXT}
          textAnchor="middle"
        >
          เกณฑ์ผ่าน {PASS_THRESHOLD}%
        </text>

        {/* รูปหลายเหลี่ยมข้อมูลจริงของนักศึกษา */}
        <polygon points={polygonPoints} fill={COLOR_FILL} stroke={COLOR_LINE} strokeWidth={2} />

        {/* จุดข้อมูลแต่ละ PLO - สีตามสถานะบรรลุ/ไม่บรรลุ */}
        {achievements.map((a, i) => {
          const p = dataPoints[i];
          const passed = a.achieved_percent >= PASS_THRESHOLD;
          return (
            <circle
              key={a.plo_code}
              cx={p.x}
              cy={p.y}
              r={5}
              fill={passed ? COLOR_GOOD : COLOR_CRITICAL}
              stroke="#fcfcfb"
              strokeWidth={2}
              tabIndex={0}
              onMouseEnter={() => setHovered(a)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(a)}
              onBlur={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <title>
                {a.plo_code}: {a.achieved_percent.toFixed(1)}% (
                {passed ? "บรรลุ" : "ไม่บรรลุ"})
              </title>
            </circle>
          );
        })}

        {/* label รหัส PLO รอบนอก */}
        {achievements.map((a, i) => {
          const p = labelPointFor(i, count);
          return (
            <text
              key={a.plo_code}
              x={p.x}
              y={p.y}
              fontSize="12"
              fill={COLOR_MUTED_TEXT}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {a.plo_code}
            </text>
          );
        })}
      </svg>

      {hovered && (
        <div className="plo-radar-tooltip">
          <strong>{hovered.plo_code}</strong>: {hovered.achieved_percent.toFixed(1)}% —{" "}
          {hovered.achieved_percent >= PASS_THRESHOLD ? "บรรลุ" : "ไม่บรรลุ"}
        </div>
      )}
    </div>
  );
}
