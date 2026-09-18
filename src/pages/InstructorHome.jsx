/**
 * ทำอะไร : หน้าแรกของอาจารย์ (route "/" เมื่อ role=instructor) — การ์ดสรุปวิชาที่สอน + จำนวนนักศึกษา
 *          ไม่ซ้ำคน + CLO บรรลุเฉลี่ย
 *          admin ก็เข้าหน้านี้ได้เหมือนกันถ้าเปลี่ยน role มาดู (ดู isAdmin)
 *
 * เชื่อมกับ : ต่อ offering หนึ่งตัวต้องยิง 3 endpoint เพิ่ม (enrollments, assessment items, CLO
 *             achievement) เพื่อคำนวณสถิติการ์ด - ทำแบบ N+1 request ต่อ offering ตั้งใจ เพราะจำนวน
 *             วิชาที่อาจารย์คนหนึ่งสอนมีไม่มาก (ไม่ใช่ทั้งหลักสูตรแบบหน้า cohort ที่ backend ต้อง batch)
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import PLODonut from "../components/PLODonut.jsx";
import {
  listCourseOfferings,
  listCourses,
  listEnrollments,
  listAssessmentItems,
  getOfferingCLOAchievement,
} from "../api/client.js";

export default function InstructorHome() {
  const { user, isAdmin } = useAuth();
  // วิชาที่อาจารย์คนนี้สอน (หรือทุกวิชาถ้าเป็น admin) พร้อมสถิติที่คำนวณเพิ่มแล้ว (ดู loadMyOfferings)
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // โหลดวิชาที่สอน (ของอาจารย์คนนี้ หรือทุกวิชาถ้าเป็น admin) แล้วยิง request เพิ่มต่อวิชาเพื่อคำนวณ
  // จำนวนนักศึกษา/ชิ้นงาน/CLO บรรลุเฉลี่ยมาประกอบเป็นการ์ดสรุป
  async function loadMyOfferings(courseMap) {
    const rawOfferings = isAdmin ? await listCourseOfferings() : await listCourseOfferings(user.id);

    const enriched = await Promise.all(
      rawOfferings.map(async (offering) => {
        const [enrollments, items, achievement] = await Promise.all([
          listEnrollments(offering.id),
          listAssessmentItems(offering.id),
          getOfferingCLOAchievement(offering.id),
        ]);
        const cloRates = achievement.clo_achievements.map((c) => c.achieved_rate_percent);
        const avgClo =
          cloRates.length > 0 ? cloRates.reduce((sum, v) => sum + v, 0) / cloRates.length : null;
        return {
          ...offering,
          course: courseMap[offering.course_id],
          enrollmentCount: enrollments.length,
          studentIds: enrollments.map((e) => e.student_id),
          itemCount: items.length,
          avgCloAchievement: avgClo,
        };
      })
    );

    setOfferings(enriched);
  }

  // โหลดข้อมูลทั้งหน้าใหม่ทุกครั้งที่ user หรือ isAdmin เปลี่ยน (เช่น เพิ่ง login เสร็จ)
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const courses = await listCourses();
        const courseMap = {};
        courses.forEach((c) => (courseMap[c.id] = c));

        await loadMyOfferings(courseMap);
      } catch {
        setError("โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
      } finally {
        setLoading(false);
      }
    }

    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  // นับนักศึกษาไม่ซ้ำคน ไม่ใช่ผลรวม enrollmentCount ตรงๆ เพราะนักศึกษาคนเดียวกันอาจลงทะเบียน
  // หลายวิชาที่อาจารย์คนนี้สอนพร้อมกัน (เช่น สอนวิชาแกนของรุ่นเดียวกันหลายวิชา) ถ้าบวกตรงๆ จะนับซ้ำ
  const totalStudents = useMemo(
    () => new Set(offerings.flatMap((o) => o.studentIds)).size,
    [offerings]
  );

  const overallAvgClo = useMemo(() => {
    const allRates = offerings.flatMap((o) =>
      o.avgCloAchievement === null ? [] : [o.avgCloAchievement]
    );
    // Weight by number of CLOs isn't tracked here, so average the per-offering
    // averages - good enough for a summary tile, not used for grading.
    return allRates.length > 0 ? allRates.reduce((s, v) => s + v, 0) / allRates.length : null;
  }, [offerings]);

  function cloBadgeClass(avg) {
    if (avg === null) return "badge-clo-unknown";
    return avg >= 60 ? "badge-pass" : "badge-fail";
  }

  return (
    <div className="page">
      <h1>หน้าหลักผู้สอน</h1>

      {error && <p className="error-message">{error}</p>}

      {!loading && !error && (
        <>
          <div className="instructor-summary-cards">
            <div className="instructor-summary-card">
              <span className="instructor-summary-value">{offerings.length}</span>
              <span className="instructor-summary-label">วิชาที่สอน</span>
            </div>
            <div className="instructor-summary-card">
              <span className="instructor-summary-value">{totalStudents}</span>
              <span className="instructor-summary-label">นักศึกษาที่สอน (นับไม่ซ้ำคน)</span>
            </div>
            <div className="instructor-summary-card instructor-summary-card-donut">
              <PLODonut percent={overallAvgClo} size={52} />
              <div>
                <span className="instructor-summary-value">
                  {overallAvgClo === null ? "ยังไม่มีข้อมูล" : `${overallAvgClo.toFixed(1)}%`}
                </span>
                <span className="instructor-summary-label">CLO บรรลุเฉลี่ยรวม</span>
              </div>
            </div>
          </div>

          {offerings.length === 0 ? (
            <p className="student-list-empty">
              คุณยังไม่ได้รับมอบหมายวิชาในภาคเรียนนี้ ติดต่อผู้ดูแลระบบให้มอบหมายวิชาให้
            </p>
          ) : (
            <div className="instructor-course-grid">
              {offerings.map((offering) => (
                <div key={offering.id} className="instructor-course-card">
                  <h3>
                    {offering.course
                      ? `${offering.course.course_code} ${offering.course.name_th}`
                      : `วิชา #${offering.id}`}
                  </h3>
                  <p className="instructor-course-meta">
                    ภาคเรียน {offering.semester}/{offering.academic_year} · section {offering.section}
                  </p>
                  <div className="instructor-course-stats">
                    <span>นักศึกษา {offering.enrollmentCount} คน</span>
                    <span>งานประเมิน {offering.itemCount} ชิ้น</span>
                  </div>
                  <div className="instructor-course-clo-row">
                    <PLODonut percent={offering.avgCloAchievement} size={36} />
                    <span className={cloBadgeClass(offering.avgCloAchievement)}>
                      CLO บรรลุ{" "}
                      {offering.avgCloAchievement === null
                        ? "ยังไม่มีข้อมูล"
                        : `${offering.avgCloAchievement.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="instructor-course-btn-row">
                    <Link
                      to={`/course-workspace?offering_id=${offering.id}`}
                      className="instructor-course-btn"
                    >
                      จัดการคะแนน/CLO
                    </Link>
                    <Link
                      to={`/course-workspace?offering_id=${offering.id}&tab=structure`}
                      className="instructor-course-btn instructor-course-btn-secondary"
                    >
                      จัดการ CLO และเกณฑ์ผ่าน
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {loading && <p>กำลังโหลด...</p>}
    </div>
  );
}
