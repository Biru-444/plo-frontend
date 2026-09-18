/**
 * ทำอะไร : หน้ารายชื่อนักศึกษาที่ลงทะเบียนวิชาหนึ่ง เทียบกับ PLO ข้อหนึ่งโดยเฉพาะ (route
 *          /plo/overview/:ploId/course/:courseId) — เดิมเป็น panel แบบ accordion ใน PLOCourseBreakdown
 *          ย้ายมาเป็นหน้าเต็มแยกต่างหาก เนื้อหา/พฤติกรรมเหมือนเดิมทุกอย่าง
 *
 * เชื่อมกับ : getCourseEnrolledStudents ส่ง plo_id ไปด้วยเพื่อให้ backend คำนวณ plo_achieved ต่อคน
 *             มาให้เลย — curriculum/cohort ส่งผ่าน query string เหมือน PLODetailPage เพื่อให้ปุ่ม
 *             "กลับไป" ย้อนกลับไปหน้า PLO detail เดิมพร้อมตัวกรองที่เลือกไว้ครบ
 *
 * ถ้าแก้ : ต้อง sort รายชื่อนักศึกษาตามรหัสแบบ numeric เองฝั่งนี้เสมอ (ดูคอมเมนต์ในโค้ด) เพราะ
 *          backend endpoint นี้ไม่ได้เรียงตามรหัสมาให้
 */
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

export default function PLOCourseDetailPage() {
  const { ploId, courseId } = useParams();
  const [searchParams] = useSearchParams();
  const curriculumId = searchParams.get("curriculum");
  const cohortYear = searchParams.get("cohort");

  // ข้อมูล PLO (สำหรับหัวข้อ/ปุ่มกลับ) และวิชา (สำหรับ badge หลัก/รอง) - โหลดแยกจากรายชื่อนักศึกษา
  const [plo, setPlo] = useState(null);
  const [course, setCourse] = useState(null);
  const [courseStatus, setCourseStatus] = useState("loading");
  // รายชื่อนักศึกษาที่ลงทะเบียนวิชานี้ พร้อมสถานะโหลด (แยก object เดียวกันเพื่อไม่ให้ status/students
  // ไม่ตรงกันชั่วขณะระหว่าง re-render)
  const [enrolled, setEnrolled] = useState({ status: "loading", students: [] });
  // ตัวกรอง "รุ่น" ของตารางนักศึกษา (เลข 2 หลักแรกของรหัสนักศึกษา) - "" = ไม่กรอง (แสดงทุกรุ่น)
  const [selectedCohortPrefix, setSelectedCohortPrefix] = useState("");

  // หา PLO object ที่ตรงกับ ploId ใน URL จากรายการ PLO ทั้งหมด (ใช้แค่ code/description มาแสดง)
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

  // หาวิชาที่ตรงกับ courseId จากแผนวิชาบังคับของ PLO นี้ (ไม่เจอ = วิชานี้ไม่ได้อยู่ในแผนของ PLO นี้
  // จริง เช่น เข้า URL ผิด -> courseStatus เป็น "error")
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

  // โหลดรายชื่อนักศึกษาที่ลงทะเบียนวิชานี้ พร้อม plo_achieved ต่อคน (ส่ง ploId ไปให้ backend คำนวณ) -
  // reset ตัวกรองรุ่นทุกครั้งที่เปลี่ยนวิชา/รุ่น/PLO เพื่อไม่ให้ค้างตัวกรองจากวิชาก่อนหน้า
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
              {visibleStudents.map((s) => {
                const fullName = `${s.title ? `${s.title} ` : ""}${s.first_name} ${s.last_name}`;
                return (
                  <Link
                    key={s.id}
                    to={`/student-clo?offering_id=${s.offering_id}&student_id=${encodeURIComponent(
                      s.id
                    )}&student_name=${encodeURIComponent(fullName)}`}
                    className="student-table-row"
                  >
                    <span className="student-table-cell">{s.id}</span>
                    <span className="student-table-cell">{fullName}</span>
                    <span className="student-table-cell">
                      <PLOAchievedBadge achieved={s.plo_achieved} />
                    </span>
                    <span className="student-table-cell student-row-arrow-cell">
                      <ChevronRight size={16} className="plo-course-chip-arrow" />
                    </span>
                  </Link>
                );
              })}
            </tbody>
          </table>
        ))}
    </div>
  );
}
