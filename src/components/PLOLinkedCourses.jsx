import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getPLOLinkedCourses } from "../api/client.js";

const DESCRIPTION_MAX_LENGTH = 60;

function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

/**
 * รายวิชาที่เชื่อมกับ PLO ข้อหนึ่งผ่าน CLO-PLO mapping โดยตรง (clo_plo_mapping) - ใช้ในหน้ารายละเอียด
 * PLO (PLODetailPage, เข้าถึงจากหน้า "ภาพรวม PLO") แทนที่ PLOCourseBreakdown.jsx เดิม (2026-09) ซึ่งดึง
 * จาก course_plo/มคอ.2 (แผนตอนออกแบบหลักสูตร ไม่ใช่หลักฐานจริงที่ใช้คำนวณ % บรรลุ PLO อีกต่อไป) - ที่นี่
 * แสดงข้อมูลตัวเดียวกับที่ backend ใช้คำนวณจริง (ดู _build_plo_requirements ใน
 * plo_achievement_service.py)
 *
 * ไม่มีลิงก์คลิกไปหน้ารายชื่อนักศึกษาต่อวิชาเหมือนของเดิม (ตั้งใจ) เพราะหน้านั้น
 * (PLOCourseDetailPage.jsx) validate ด้วย course_plo อยู่ - วิชาที่เชื่อมผ่าน CLO อย่างเดียว (ไม่มีแถวใน
 * course_plo เลย ซึ่งเป็นเคสปกติตอนนี้ เพราะการนำเข้าด้วย AI ไม่สร้าง course_plo ให้) จะกดแล้วเจอหน้า
 * error ทันที - แสดงเป็นข้อความธรรมดาแทนดีกว่า (ผู้ใช้ยืนยันแล้ว 2026-09)
 */
export default function PLOLinkedCourses({ ploId }) {
  const { isAdmin } = useAuth();
  const [state, setState] = useState({ status: "loading", courses: [] });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", courses: [] });

    getPLOLinkedCourses(ploId)
      .then((courses) => {
        if (!cancelled) setState({ status: "ready", courses });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", courses: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [ploId]);

  const totalCloCount = state.courses.reduce((sum, c) => sum + c.clos.length, 0);

  return (
    <div className="plo-course-breakdown">
      <div className="plo-course-plan-block">
        <div className="plo-course-breakdown-header">
          <span className="plo-course-breakdown-label">
            รายวิชาที่เชื่อมกับ PLO นี้ (ผ่าน CLO)
            <Info
              size={13}
              strokeWidth={2}
              title="ข้อมูลจาก CLO ที่ผูกกับ PLO นี้โดยตรง (clo_plo_mapping) - หลักฐานเดียวกับที่ใช้คำนวณ % บรรลุ PLO"
            />
          </span>
        </div>

        {state.status === "loading" && <p className="loading-message">กำลังโหลดข้อมูล...</p>}
        {state.status === "error" && (
          <p className="error-message">โหลดรายชื่อวิชาไม่สำเร็จ ลองใหม่อีกครั้ง</p>
        )}

        {state.status === "ready" &&
          (state.courses.length === 0 ? (
            <p className="student-list-empty">
              ยังไม่มีรายวิชาที่เชื่อมกับ PLO นี้
              {isAdmin && (
                <>
                  {" "}
                  · <Link to="/admin/clo-plo-mapping">ไปผูกที่หน้า CLO-PLO Mapping</Link>
                </>
              )}
            </p>
          ) : (
            <>
              <p className="plo-linked-courses-summary">
                เชื่อมอยู่ {state.courses.length} รายวิชา, {totalCloCount} CLO
              </p>
              <div className="plo-linked-courses-list">
                {state.courses.map((course) => (
                  <div key={course.course_id} className="plo-linked-course-item">
                    <div className="plo-linked-course-header">
                      <span className="plo-linked-course-name">
                        {course.course_code} {course.course_name_th}
                      </span>
                      <span className="plo-course-chip-badge">{course.clos.length} CLO</span>
                    </div>
                    <ul className="plo-linked-course-clos">
                      {course.clos.map((clo) => (
                        <li key={clo.clo_id}>
                          {clo.clo_code} · {truncate(clo.description_th, DESCRIPTION_MAX_LENGTH)} ·{" "}
                          {clo.weight_percent}%
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          ))}
      </div>
    </div>
  );
}
