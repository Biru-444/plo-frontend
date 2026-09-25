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
// TASK-plo-denominator: achievedRatePercent เป็น null ได้ (ไม่มีใครมีข้อมูลของ PLO นี้เลย) - แยกสถานะ
// "no-data" (เทา) ออกจาก "at-goal"/"at-risk" ชัดเจน แสดง coverage (studentCountWithData/totalStudents)
// คู่กับจำนวนที่บรรลุเสมอ ผู้เรียกเก่าที่ยังไม่ส่ง studentCountWithData/coveragePercent มา (ไม่ควรมีแล้ว
// แต่กันไว้) จะไม่เห็นบรรทัด coverage เพิ่ม ไม่พัง
//
// 2026-09: การ์ด no-data แยกเหตุผลตาม hasCloMapping (ดู PLOCohortSummaryItem.has_clo_mapping) แทน
// ข้อความ "ยังไม่มีข้อมูล" เดียวกันหมด - false = PLO ยังไม่มี CLO ผูกเลย (ตั้งค่าไม่ครบ), true = ผูกแล้ว
// แต่ยังไม่มีนักศึกษา/คะแนน (รอข้อมูลจริง) - ผู้เรียกเก่าที่ยังไม่ส่ง hasCloMapping มา (undefined) ยังเห็น
// ข้อความเดิม "ยังไม่มีข้อมูล" เหมือนก่อนแก้ ไม่พัง
function noDataReason(hasCloMapping) {
  if (hasCloMapping === false) return "ยังไม่ผูกกับรายวิชา (ยังไม่มี CLO-PLO Mapping)";
  if (hasCloMapping === true) return "ยังไม่มีข้อมูลคะแนนนักศึกษา";
  return "ยังไม่มีข้อมูล";
}

export default function PLOSummaryCard({
  code,
  description,
  achievedRatePercent,
  achievedCount,
  totalStudents,
  studentCountWithData,
  coveragePercent,
  hasCloMapping,
  isAchieved,
  to,
}) {
  const hasData = achievedRatePercent !== null && achievedRatePercent !== undefined;
  const statusClass = !hasData ? "no-data" : isAchieved ? "at-goal" : "at-risk";
  return (
    <Link to={to} className={`plo-summary-card ${statusClass}`}>
      <PLODonut
        percent={achievedRatePercent}
        size={56}
        color={!hasData ? "var(--color-gray-400)" : isAchieved ? "var(--color-green-700)" : "var(--color-red-700)"}
        hideLabel
      />
      <div className="plo-summary-card-text">
        <span className="plo-summary-card-code">{code}</span>
        {hasData ? (
          <span className="plo-summary-card-count">
            {achievedCount}/{studentCountWithData ?? totalStudents} คนที่มีข้อมูล
          </span>
        ) : (
          <span className="plo-summary-card-count plo-summary-card-nodata">
            {noDataReason(hasCloMapping)}
          </span>
        )}
        {studentCountWithData !== undefined && coveragePercent !== undefined && (
          <span className="plo-summary-card-coverage">
            จากทั้งหมด {totalStudents} คน ({coveragePercent.toFixed(0)}% มีข้อมูล)
          </span>
        )}
        <span className="plo-summary-card-desc" title={description}>
          {truncate(description, KEYWORD_MAX_LENGTH)}
        </span>
      </div>
    </Link>
  );
}
