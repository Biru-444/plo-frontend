import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getCourseEnrolledStudents, getPLOCoursePlan, listPLO } from "../api/client.js";

const RESPONSIBILITY_LABEL = { primary: "หลัก", secondary: "รอง" };

// plo_achieved เป็น null ตอนไม่มีข้อมูลให้ประเมินเลย (ไม่มี CLO ผูกกับ PLO นี้ในวิชานี้เลย หรือนักศึกษา
// ยังไม่มีคะแนนบันทึกเลยสักรายการ) - คนละความหมายกับ false (มีคะแนนแล้วแต่ไม่ถึงเกณฑ์) ห้ามแสดงเป็น
// "ไม่ผ่าน" ตอนที่จริงๆ ยังไม่มีข้อมูล (โทนสีเดียวกับ badge "บรรลุ"/"ไม่บรรลุ" ที่ .plo-badge.achieved/
// .not-achieved ใน index.css ใช้อยู่แล้ว)
function PLOAchievedBadge({ achieved }) {
  if (achieved === null || achieved === undefined) {
    return <span className="plo-achieved-empty">—</span>;
  }
  return (
    <span className={`plo-badge ${achieved ? "achieved" : "not-achieved"}`}>
      {achieved ? "ผ่าน" : "ไม่ผ่าน"}
    </span>
  );
}

/**
 * หน้ารายชื่อนักศึกษาที่ลงทะเบียนวิชาหนึ่ง เทียบกับ PLO ข้อหนึ่งโดยเฉพาะ - เดิมเป็น panel ที่ขยายแบบ
 * accordion จาก chip วิชาในหน้า PLO detail (PLOCourseBreakdown) ย้ายมาเป็นหน้าเต็มแยกต่างหากตามที่ตกลง
 * เนื้อหา/พฤติกรรมเป็นชุดเดิมทุกอย่าง (fetch enrolled-students พร้อม plo_id, filter รุ่นฝั่ง client,
 * เรียง numeric id, คอลัมน์ผลการบรรลุ) ไม่มีอะไรเปลี่ยน
 *
 * route: /plo/overview/:ploId/course/:courseId - curriculum/cohort ส่งผ่าน query string เหมือน
 * PLODetailPage เพื่อให้ปุ่ม "กลับไป" ย้อนกลับไปหน้า PLO detail เดิมพร้อมตัวกรองที่เลือกไว้ครบ
 */
export default function PLOCourseDetailPage() {
  const { ploId, courseId } = useParams();
  const [searchParams] = useSearchParams();
  const curriculumId = searchParams.get("curriculum");
  const cohortYear = searchParams.get("cohort");

  const [plo, setPlo] = useState(null);
  const [course, setCourse] = useState(null);
  const [courseStatus, setCourseStatus] = useState("loading");
  const [enrolled, setEnrolled] = useState({ status: "loading", students: [] });
  const [selectedCohortPrefix, setSelectedCohortPrefix] = useState("");

  useEffect(() => {
    let cancelled = false;
    listPLO()
      .then((plos) => {
        if (!cancelled) setPlo(plos.find((p) => String(p.id) === String(ploId)) ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ploId]);

  useEffect(() => {
    let cancelled = false;
    setCourseStatus("loading");
    setCourse(null);
    getPLOCoursePlan(ploId)
      .then((courses) => {
        if (cancelled) return;
        const found = courses.find((c) => String(c.course_id) === String(courseId)) ?? null;
        setCourse(found);
        setCourseStatus(found ? "ready" : "error");
      })
      .catch(() => {
        if (!cancelled) setCourseStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [ploId, courseId]);

  useEffect(() => {
    let cancelled = false;
    setEnrolled({ status: "loading", students: [] });
    setSelectedCohortPrefix("");

    getCourseEnrolledStudents(courseId, cohortYear ? Number(cohortYear) : null, ploId)
      .then((students) => {
        if (cancelled) return;
        // เรียงตามรหัสนักศึกษาน้อยไปมากตามค่าตัวเลขจริงเสมอ (numeric ไม่ใช่ string/localeCompare -
        // string sort จะพังถ้ารหัสยาวไม่เท่ากัน เช่น "9" ไปอยู่หลัง "10") - backend endpoint นี้ไม่ได้
        // sort ตามรหัสมาให้ (sort ตามชื่อ) จึงต้อง sort ใหม่ฝั่งนี้เสมอ ไม่พึ่งลำดับที่ backend ส่งมา
        const sorted = [...students].sort((a, b) => Number(a.id) - Number(b.id));
        setEnrolled({ status: "ready", students: sorted });
      })
      .catch(() => {
        if (!cancelled) setEnrolled({ status: "error", students: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, cohortYear, ploId]);

  // ตัวเลือก "รุ่น" สร้างจากรหัสนักศึกษาที่ fetch มาแล้วจริงเท่านั้น (dynamic ตามข้อมูลปัจจุบัน ไม่ hardcode)
  const availableCohortPrefixes = useMemo(() => {
    const prefixes = new Set();
    enrolled.students.forEach((s) => prefixes.add(s.id.slice(0, 2)));
    return Array.from(prefixes).sort((a, b) => Number(a) - Number(b));
  }, [enrolled.students]);

  const visibleStudents = selectedCohortPrefix
    ? enrolled.students.filter((s) => s.id.slice(0, 2) === selectedCohortPrefix)
    : enrolled.students;

  const backQuery = curriculumId
    ? `?curriculum=${curriculumId}${cohortYear ? `&cohort=${cohortYear}` : ""}`
    : "";
  const backHref = `/plo/overview/${ploId}${backQuery}`;

  return (
    <div className="page">
      <Link to={backHref} className="crud-back-link">
        <ArrowLeft size={14} strokeWidth={2} />
        กลับไป{plo ? ` ${plo.code}` : "PLO"}
      </Link>

      <h1>{course ? `${course.course_code} ${course.name_th}` : "รายละเอียดวิชา"}</h1>
      {course && (
        <span className="plo-course-chip-badge">
          {RESPONSIBILITY_LABEL[course.responsibility_level] ?? course.responsibility_level}
        </span>
      )}
      {courseStatus === "error" && (
        <p className="error-message">ไม่พบวิชานี้ในแผนหลักสูตรของ PLO ข้อนี้</p>
      )}

      <div className="plo-course-breakdown-header">
        <span className="plo-course-breakdown-label">นักศึกษาที่ลงทะเบียน</span>
        <label className="plo-cohort-prefix-filter">
          รุ่น
          <select
            value={selectedCohortPrefix}
            onChange={(e) => setSelectedCohortPrefix(e.target.value)}
            title="กรองตารางนักศึกษาที่ลงทะเบียนด้วยรุ่น (เลข 2 หลักแรกของรหัสนักศึกษา)"
          >
            <option value="">ทั้งหมด</option>
            {availableCohortPrefixes.map((prefix) => (
              <option key={prefix} value={prefix}>
                {prefix}
              </option>
            ))}
          </select>
        </label>
      </div>

      {enrolled.status === "loading" && <p className="loading-message">กำลังโหลดข้อมูล...</p>}
      {enrolled.status === "error" && (
        <p className="error-message">โหลดรายชื่อนักศึกษาไม่สำเร็จ ลองใหม่อีกครั้ง</p>
      )}
      {enrolled.status === "ready" &&
        (visibleStudents.length === 0 ? (
          <p className="student-list-empty">
            {selectedCohortPrefix
              ? `ไม่มีนักศึกษารุ่น ${selectedCohortPrefix} ลงทะเบียนวิชานี้`
              : "ยังไม่มีนักศึกษาลงทะเบียนวิชานี้ในรุ่นที่เลือก"}
          </p>
        ) : (
          <table className="student-table">
            <thead>
              <tr>
                <th>รหัสนักศึกษา</th>
                <th>ชื่อ-นามสกุล</th>
                <th>ผลการบรรลุ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((s) => (
                <Link
                  key={s.id}
                  to={`/student-plo?student_id=${encodeURIComponent(s.id)}`}
                  className="student-table-row"
                >
                  <span className="student-table-cell">{s.id}</span>
                  <span className="student-table-cell">
                    {s.title ? `${s.title} ` : ""}
                    {s.first_name} {s.last_name}
                  </span>
                  <span className="student-table-cell">
                    <PLOAchievedBadge achieved={s.plo_achieved} />
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
  );
}
