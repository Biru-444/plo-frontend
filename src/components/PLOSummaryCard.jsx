import { Link } from "react-router-dom";
import PLODonut from "./PLODonut.jsx";

const KEYWORD_MAX_LENGTH = 60;

function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

/**
 * การ์ดสรุปย่อต่อ PLO 1 ใบ ใช้ในหน้ารายการ ("ภาพรวม PLO" / "PLO เมื่อจบการศึกษา") - กดแล้วเปลี่ยน
 * หน้าไปหน้ารายละเอียด (PLODetailPage) จริง ไม่ใช่ expand ในที่เดิมอีกต่อไป (ชิปวิชา/ตารางนักศึกษา
 * ย้ายไปอยู่หน้ารายละเอียดทั้งหมด) - `to` ต้องมี query param หลักสูตร/รุ่นที่กำลังเลือกอยู่ติดไปด้วย
 * ผู้เรียกเป็นคนสร้าง URL เอง กันไม่ให้ filter หายตอนเปลี่ยนหน้า
 */
export default function PLOSummaryCard({ code, description, achievedRatePercent, isAchieved, to }) {
  return (
    <Link to={to} className={`plo-summary-card ${isAchieved ? "at-goal" : "at-risk"}`}>
      <PLODonut
        percent={achievedRatePercent}
        size={56}
        color={isAchieved ? "var(--color-green-700)" : "var(--color-red-700)"}
      />
      <div className="plo-summary-card-text">
        <span className="plo-summary-card-code">{code}</span>
        <span className="plo-summary-card-desc" title={description}>
          {truncate(description, KEYWORD_MAX_LENGTH)}
        </span>
      </div>
    </Link>
  );
}
