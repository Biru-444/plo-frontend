import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import PLODonut from "../components/PLODonut.jsx";
import {
  listCourseOfferings,
  listUnassignedCourseOfferings,
  claimCourseOffering,
  releaseCourseOffering,
  listCourses,
  listEnrollments,
  listAssessmentItems,
  getOfferingCLOAchievement,
} from "../api/client.js";

export default function InstructorHome() {
  const { user, isAdmin } = useAuth();
  const [offerings, setOfferings] = useState([]);
  const [courseById, setCourseById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [unassignedOfferings, setUnassignedOfferings] = useState([]);
  const [claimingId, setClaimingId] = useState(null);
  const [claimError, setClaimError] = useState("");
  const [releasingId, setReleasingId] = useState(null);
  const [releaseError, setReleaseError] = useState("");

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

  async function loadUnassignedOfferings() {
    if (isAdmin) return; // การจับจองเป็นของอาจารย์เท่านั้น - แอดมินมอบหมายตรงที่หน้าจัดการระบบ
    const raw = await listUnassignedCourseOfferings();
    setUnassignedOfferings(raw);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const courses = await listCourses();
        const courseMap = {};
        courses.forEach((c) => (courseMap[c.id] = c));
        setCourseById(courseMap);

        await Promise.all([loadMyOfferings(courseMap), loadUnassignedOfferings()]);
      } catch {
        setError("โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
      } finally {
        setLoading(false);
      }
    }

    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  async function handleClaim(offeringId) {
    setClaimingId(offeringId);
    setClaimError("");
    try {
      await claimCourseOffering(offeringId);
      await Promise.all([loadMyOfferings(courseById), loadUnassignedOfferings()]);
    } catch (err) {
      setClaimError(
        err?.response?.data?.detail || "จับจองวิชานี้ไม่สำเร็จ ลองรีเฟรชหน้านี้แล้วลองใหม่"
      );
      await loadUnassignedOfferings(); // เผื่อมีคนอื่นจับจองไปแล้ว รีเฟรชให้รายการตรงกับความจริง
    } finally {
      setClaimingId(null);
    }
  }

  async function handleRelease(offering) {
    const courseLabel = offering.course
      ? `${offering.course.course_code} ${offering.course.name_th} หมู่ ${offering.section}`
      : `วิชา #${offering.id}`;
    if (!window.confirm(`ยืนยันปล่อยคืนวิชา "${courseLabel}"? คุณจะไม่ใช่ผู้สอนวิชานี้อีกต่อไป`)) return;
    setReleasingId(offering.id);
    setReleaseError("");
    try {
      await releaseCourseOffering(offering.id);
      await Promise.all([loadMyOfferings(courseById), loadUnassignedOfferings()]);
    } catch (err) {
      setReleaseError(err?.response?.data?.detail || "ปล่อยคืนวิชานี้ไม่สำเร็จ");
    } finally {
      setReleasingId(null);
    }
  }

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
              คุณยังไม่ได้รับมอบหมายวิชาในภาคเรียนนี้
              {isAdmin
                ? " ติดต่อผู้ดูแลระบบ"
                : unassignedOfferings.length > 0
                ? " — ลองจับจองวิชาที่เปิดว่างด้านล่างได้เลย"
                : " ติดต่อผู้ดูแลระบบให้มอบหมายวิชาให้"}
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
                  <Link to={`/course-workspace?offering_id=${offering.id}`} className="instructor-course-btn">
                    จัดการคะแนน/CLO
                  </Link>
                  {!isAdmin && (
                    <button
                      type="button"
                      className="instructor-course-release-btn"
                      disabled={releasingId === offering.id}
                      onClick={() => handleRelease(offering)}
                    >
                      {releasingId === offering.id ? "กำลังปล่อยคืน..." : "ปล่อยคืนวิชานี้"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {releaseError && <p className="error-message">{releaseError}</p>}

          {!isAdmin && (
            <div className="workspace-section instructor-claim-section">
              <h2>วิชาที่เปิดให้จับจอง</h2>
              <p className="workspace-hint-inline">
                รายวิชาด้านล่างยังไม่มีผู้สอน กดจับจองเพื่อรับเป็นผู้สอนวิชานั้นได้เลย (ถ้ามีอาจารย์
                ท่านอื่นจับจองไปก่อนพอดี ระบบจะแจ้งเตือนให้เลือกวิชาอื่นแทน)
              </p>
              {claimError && <p className="error-message">{claimError}</p>}
              {unassignedOfferings.length === 0 ? (
                <p className="student-list-empty">ตอนนี้ไม่มีวิชาที่เปิดว่างให้จับจอง</p>
              ) : (
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>รายวิชา</th>
                      <th>ภาคเรียน</th>
                      <th>หมู่เรียน</th>
                      <th>รุ่น (cohort)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedOfferings.map((offering) => (
                      <tr key={offering.id} className="student-table-row">
                        <td className="student-table-cell">
                          {courseById[offering.course_id]
                            ? `${courseById[offering.course_id].course_code} ${
                                courseById[offering.course_id].name_th
                              }`
                            : `วิชา #${offering.id}`}
                        </td>
                        <td className="student-table-cell">
                          {offering.semester}/{offering.academic_year}
                        </td>
                        <td className="student-table-cell">{offering.section}</td>
                        <td className="student-table-cell">{offering.cohort_year ?? "-"}</td>
                        <td className="student-table-cell">
                          <button
                            type="button"
                            disabled={claimingId === offering.id}
                            onClick={() => handleClaim(offering.id)}
                          >
                            {claimingId === offering.id ? "กำลังจับจอง..." : "จับจองวิชานี้"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {loading && <p>กำลังโหลด...</p>}
    </div>
  );
}
