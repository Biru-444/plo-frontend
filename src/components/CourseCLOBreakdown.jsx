import { useEffect, useState } from "react";
import { getStudentCourseCLOBreakdown } from "../api/client.js";

/**
 * เจาะลึกระดับ CLO -> คะแนน สำหรับนักศึกษาคนหนึ่งในวิชาหนึ่ง (ทำไมวิชานี้ผ่าน/ไม่ผ่าน) - แสดงทุก CLO
 * ของวิชานั้นพร้อมผ่าน/ไม่ผ่าน และชิ้นงานประเมินที่เอามาคำนวณ CLO แต่ละข้อ (ชื่องาน, คะแนนที่ได้/เต็ม,
 * น้ำหนัก) มาจาก GET /clo-achievement/student-course โดยตรง (ไม่รับ data สำเร็จรูปจากภายนอก) - fetch
 * เองตอน mount ผู้เรียกแค่ conditionally render component นี้ตอนขยายแถว ไม่ต้องจัดการ fetch/cache state
 * เอง
 *
 * ใช้ร่วมกันทั้งหน้า /student-plo (StudentYearBreakdown.jsx - รายวิชาของนักศึกษาคนเดียว ไล่ตามชั้นปี)
 * และหน้า "ภาพรวม PLO" (PLOStudentBreakdown.jsx - รายวิชาต่อ PLO ของนักศึกษาแต่ละคนในตาราง) แทนที่จะ
 * เขียนตรรกะ course -> CLO -> คะแนน แยกกันคนละแบบสองที่ ตามที่ตกลงกันไว้ (2026-09-09) ว่าทั้ง 4 ระดับ
 * CLO/รายวิชา/YLO/PLO ต้องเชื่อมโยงกันเป็นสายเดียว ดูได้ทั้งสองทิศทางโดยไม่มี logic ซ้ำซ้อน/ไม่ตรงกัน
 */
export default function CourseCLOBreakdown({ studentId, courseId }) {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null });
    getStudentCourseCLOBreakdown(studentId, courseId)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, courseId]);

  if (state.status === "loading") return <p className="loading-message">กำลังโหลดข้อมูล...</p>;
  if (state.status === "error") {
    return <p className="error-message">โหลดรายละเอียดไม่สำเร็จ ลองใหม่อีกครั้ง</p>;
  }
  if (state.data.clos.length === 0) {
    return <p className="student-list-empty">วิชานี้ยังไม่มี CLO กำหนดไว้</p>;
  }

  return (
    <div className="clo-breakdown-list">
      {state.data.clos.map((clo) => (
        <div key={clo.clo_id} className="clo-breakdown-block">
          <div className="clo-breakdown-header">
            <span className="clo-trace-item-name">
              {clo.clo_code} — {clo.description}
            </span>
            <span className={clo.passed ? "badge-pass" : "badge-fail"}>
              {clo.mastery_percent != null
                ? `${clo.mastery_percent}% (เกณฑ์ ${clo.pass_threshold_percent}%)`
                : "ไม่มีข้อมูลคะแนน"}
            </span>
          </div>
          {clo.items.length === 0 ? (
            <p className="workspace-muted">CLO นี้ยังไม่ได้ผูกกับชิ้นงานประเมินใด</p>
          ) : (
            <ul className="clo-trace-list">
              {clo.items.map((item) => (
                <li key={item.item_id}>
                  <span className="clo-trace-item-name">
                    {item.item_name} ({item.item_type})
                  </span>
                  <span className="clo-trace-item-weight">
                    {item.score_obtained != null
                      ? `${item.score_obtained}/${item.total_score}`
                      : "ยังไม่มีคะแนน"}{" "}
                    · น้ำหนัก {item.weight_percent}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
