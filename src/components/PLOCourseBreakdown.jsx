import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Info } from "lucide-react";
import { getPLOCoursePlan } from "../api/client.js";

const RESPONSIBILITY_LABEL = { primary: "หลัก", secondary: "รอง" };

/**
 * รายการวิชาตามแผนหลักสูตร (มคอ.2, course_plo) ของ PLO ข้อหนึ่ง - ใช้ในหน้ารายละเอียด PLO
 * (PLODetailPage, เข้าถึงจากหน้า "ภาพรวม PLO") แสดงเป็นลิสต์แนวตั้งเต็มความกว้างทีละแถว (เดิมเป็น chip
 * แนวนอน กดแล้ว accordion ขยายในหน้าเดิม - เปลี่ยนเป็นแต่ละแถวคลิกแล้วนำทางไปหน้าเต็มแยกต่างหากแทน ดู
 * PLOCourseDetailPage.jsx ที่ย้ายเนื้อหาเดิมของ accordion ไปทั้งชุด: ตารางนักศึกษาที่ลงทะเบียน,
 * filter รุ่น, คอลัมน์ผลการบรรลุ)
 *
 * curriculumId ใช้แค่สร้าง URL ของแต่ละแถว (route /plo/overview/{ploId}/course/{course_id} คู่กับ route
 * ของ PLODetailPage เอง) ให้หน้าใหม่มีปุ่ม "กลับไป" ย้อนมาที่นี่พร้อมตัวกรองที่เลือกไว้ได้ถูกต้อง -
 * cohortYear ก็ส่งผ่าน query string เดียวกัน เพื่อให้หน้าใหม่ fetch roster ของรุ่นเดียวกับที่หน้านี้กรองอยู่
 */
export default function PLOCourseBreakdown({ ploId, cohortYear, curriculumId }) {
  const [coursePlan, setCoursePlan] = useState({ status: "loading", courses: [] });

  useEffect(() => {
    let cancelled = false;
    setCoursePlan({ status: "loading", courses: [] });

    getPLOCoursePlan(ploId)
      .then((courses) => {
        if (!cancelled) setCoursePlan({ status: "ready", courses });
      })
      .catch(() => {
        if (!cancelled) setCoursePlan({ status: "error", courses: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [ploId]);

  function courseHref(courseId) {
    const query = curriculumId
      ? `?curriculum=${curriculumId}${cohortYear ? `&cohort=${cohortYear}` : ""}`
      : "";
    return `/plo/overview/${ploId}/course/${courseId}${query}`;
  }

  return (
    <div className="plo-course-breakdown">
      <div className="plo-course-plan-block">
        <div className="plo-course-breakdown-header">
          <span className="plo-course-breakdown-label">
            วิชาตามแผนหลักสูตร (มคอ.2)
            <Info size={13} strokeWidth={2} title="ข้อมูลจากแผนหลักสูตรตอนออกแบบ (course_plo)" />
          </span>
        </div>
        {coursePlan.status === "loading" && <p className="loading-message">กำลังโหลดข้อมูล...</p>}
        {coursePlan.status === "error" && (
          <p className="error-message">โหลดรายชื่อวิชาไม่สำเร็จ ลองใหม่อีกครั้ง</p>
        )}
        {coursePlan.status === "ready" &&
          (coursePlan.courses.length === 0 ? (
            <p className="student-list-empty">หลักสูตรนี้ยังไม่ได้กำหนดวิชาให้ PLO ข้อนี้ในแผนหลักสูตร</p>
          ) : (
            <table className="student-table">
              <tbody>
                {coursePlan.courses.map((c) => (
                  <Link key={c.course_id} to={courseHref(c.course_id)} className="student-table-row">
                    <span className="student-table-cell">
                      {c.course_code} {c.name_th}
                    </span>
                    <span className="student-table-cell">
                      <span className="plo-course-chip-badge">
                        {RESPONSIBILITY_LABEL[c.responsibility_level] ?? c.responsibility_level}
                      </span>
                    </span>
                    <span className="student-table-cell student-row-arrow-cell">
                      <ChevronRight size={16} className="plo-course-chip-arrow" />
                    </span>
                  </Link>
                ))}
              </tbody>
            </table>
          ))}
      </div>
    </div>
  );
}
