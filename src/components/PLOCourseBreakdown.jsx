import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Info } from "lucide-react";
import { getCourseEnrolledStudents, getPLOCoursePlan, getPLOLinkedCourses } from "../api/client.js";

const RESPONSIBILITY_LABEL = { primary: "หลัก", secondary: "รอง" };

/**
 * ชิปวิชา 1 ใบ กดแล้วขยาย/พับได้อิสระต่อกัน โชว์รายชื่อนักศึกษาที่ลงทะเบียนวิชานี้จริง (จาก enrollment
 * ผ่าน courseId+cohortYear) - คนละเรื่องกับตาราง "บรรลุ PLO" ที่อยู่ท้ายการ์ด PLO (ไม่เกี่ยวกัน ห้ามปน)
 * แคช enrolled students ไว้ต่อ courseId ใช้ร่วมกันได้ทั้ง 2 บล็อกถ้าวิชาเดียวกันโผล่ทั้งคู่
 */
function CourseChip({ course, badge, isOpen, onToggle, enrolled, cohortPrefix }) {
  // กรอง "รุ่น" (เลข 2 หลักแรกของรหัสนักศึกษา) เพิ่มจากที่ backend ส่งมาแล้ว (ซึ่ง sort เรียบร้อย
  // ตาม numeric ID ที่ toggleChip ทำไว้ตอน fetch) - AND กับวิชาที่กำลังดู (chip ไหนกางอยู่) อยู่แล้ว
  // โดยธรรมชาติ เพราะ enrolled ผูกกับวิชานั้นวิชาเดียว ไม่ต้อง AND เพิ่มเอง
  const visibleStudents = cohortPrefix
    ? (enrolled?.students ?? []).filter((s) => s.id.slice(0, 2) === cohortPrefix)
    : enrolled?.students ?? [];

  return (
    <>
      <button
        type="button"
        className={`plo-course-chip ${isOpen ? "expanded" : ""}`}
        onClick={onToggle}
      >
        <span>
          {course.course_code} {course.name_th}
        </span>
        <span className="plo-course-chip-badge">{badge}</span>
        <ChevronRight size={14} className="plo-course-chip-arrow" />
      </button>
      {isOpen && (
        <div className="plo-course-chip-panel">
          <span className="plo-course-chip-panel-title">
            นักศึกษาที่ลงทะเบียน {course.course_code} {course.name_th}
          </span>
          {enrolled?.status === "loading" && <p className="loading-message">กำลังโหลดข้อมูล...</p>}
          {enrolled?.status === "error" && (
            <p className="error-message">โหลดรายชื่อนักศึกษาไม่สำเร็จ ลองใหม่อีกครั้ง</p>
          )}
          {enrolled?.status === "ready" &&
            (visibleStudents.length === 0 ? (
              <p className="student-list-empty">
                {cohortPrefix
                  ? `ไม่มีนักศึกษารุ่น ${cohortPrefix} ลงทะเบียนวิชานี้`
                  : "ยังไม่มีนักศึกษาลงทะเบียนวิชานี้ในรุ่นที่เลือก"}
              </p>
            ) : (
              <table className="student-table plo-breakdown-table">
                <thead>
                  <tr>
                    <th>รหัสนักศึกษา</th>
                    <th>ชื่อ-นามสกุล</th>
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
                      <span className="student-table-cell student-row-arrow-cell">
                        <ChevronRight size={16} className="plo-course-chip-arrow" />
                      </span>
                    </Link>
                  ))}
                </tbody>
              </table>
            ))}
        </div>
      )}
    </>
  );
}

/**
 * ใช้ร่วมกันระหว่างหน้า "ภาพรวม PLO" (PLODashboard) และ "PLO เมื่อจบการศึกษา" (PLOYearProgress)
 * ในส่วนขยายของการ์ด PLO แต่ละใบ - แสดง 2 แหล่งข้อมูลวิชาที่เชื่อมกับ PLO แยกกันชัดเจน ห้ามเอามาปนกัน:
 *   - "วิชาตามแผนหลักสูตร (มคอ.2)" จาก course_plo (ตอนออกแบบหลักสูตร, มี primary/secondary)
 *   - "วิชาที่ผูกจริงจากการสอน (CLO)" จาก clo_plo_mapping (อาจารย์ผูกเองตอนสอน ผ่าน CLO)
 * ทั้งสองไม่ขึ้นกับ cohort/รุ่นที่เข้าเรียน (ผูกกับ course_id ตรงๆ) - cohortYear ใช้แค่ตอนกดชิปขยายดู
 * รายชื่อนักศึกษาที่ลงทะเบียนวิชานั้น ให้ตรงกับตัวกรอง "รุ่นที่เข้าเรียน" ที่หน้ากำลังเลือกอยู่
 * onInteract (optional) เรียกทุกครั้งที่กดชิปวิชาอันไหนก็ได้ (ทั้งขยาย/ยุบ) - ผู้เรียกใช้เป็นสัญญาณ
 * "ผู้ใช้กดชิปแล้ว" เพื่อโชว์ตาราง "บรรลุ PLO" ท้ายการ์ด PLO ที่ถูกซ่อนไว้ก่อนเป็นค่าเริ่มต้น
 */
export default function PLOCourseBreakdown({ ploId, cohortYear, onInteract }) {
  const [coursePlan, setCoursePlan] = useState({ status: "loading", courses: [] });
  const [linkedCourses, setLinkedCourses] = useState({ status: "loading", courses: [] });
  // key: `${source}-${course_id}` -> เก็บว่าชิปไหนกางอยู่ (แต่ละชิปเป็นอิสระต่อกัน เปิดพร้อมกันได้หลายอัน)
  const [openChipKeys, setOpenChipKeys] = useState(new Set());
  // { [course_id]: { status: 'loading'|'ready'|'error', students: [] } } - ใช้ร่วมกันทั้ง 2 บล็อก
  const [enrolledByCourseId, setEnrolledByCourseId] = useState({});
  // filter "รุ่น" (เลข 2 หลักแรกของรหัสนักศึกษา เช่น 66, 67) เพิ่มจากตัวกรอง "รุ่นที่เข้าเรียน" ระดับหน้า
  // (cohortYear prop ด้านบน ซึ่งกำหนดว่า fetch ข้อมูลของรุ่นไหนมาตั้งแต่แรก) - อันนี้เป็นตัวกรองฝั่ง
  // client เพิ่มเติมสำหรับกรณีเลือก "ทุกรุ่น" ไว้ที่หน้ารายการ แล้วอยากดูรุ่นเดียวโดยไม่ต้องย้อนกลับไปเลือกใหม่
  // - ใช้ร่วมกันทั้ง 2 ฝั่ง (มคอ.2 / CLO-linked) เพราะเป็น instance เดียวกันของ component นี้
  const [selectedCohortPrefix, setSelectedCohortPrefix] = useState("");

  // ตัวเลือก "รุ่น" สร้างจากรหัสนักศึกษาที่ fetch มาแล้วจริงเท่านั้น (dynamic ตามข้อมูลปัจจุบัน ไม่ hardcode)
  // เรียงน้อยไปมาก
  const availableCohortPrefixes = useMemo(() => {
    const prefixes = new Set();
    Object.values(enrolledByCourseId).forEach((entry) => {
      (entry.students ?? []).forEach((s) => prefixes.add(s.id.slice(0, 2)));
    });
    return Array.from(prefixes).sort((a, b) => Number(a) - Number(b));
  }, [enrolledByCourseId]);

  useEffect(() => {
    let cancelled = false;
    setCoursePlan({ status: "loading", courses: [] });
    setLinkedCourses({ status: "loading", courses: [] });
    setOpenChipKeys(new Set());
    setEnrolledByCourseId({});
    setSelectedCohortPrefix("");

    getPLOCoursePlan(ploId)
      .then((courses) => {
        if (!cancelled) setCoursePlan({ status: "ready", courses });
      })
      .catch(() => {
        if (!cancelled) setCoursePlan({ status: "error", courses: [] });
      });

    getPLOLinkedCourses(ploId)
      .then((courses) => {
        if (!cancelled) setLinkedCourses({ status: "ready", courses });
      })
      .catch(() => {
        if (!cancelled) setLinkedCourses({ status: "error", courses: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [ploId]);

  // รุ่นที่เข้าเรียนที่หน้ากำลังเลือกเปลี่ยน -> รายชื่อนักศึกษาที่แคชไว้ไม่ตรงกับตัวกรองใหม่แล้ว ต้องเคลียร์
  useEffect(() => {
    setEnrolledByCourseId({});
    setSelectedCohortPrefix("");
  }, [cohortYear]);

  function toggleChip(source, courseId) {
    // นับเป็น "กดชิปแล้ว" ทั้งตอนขยายและตอนยุบ - ผู้เรียกใช้เพื่อโชว์ตาราง "บรรลุ PLO" ท้ายการ์ด
    // ครั้งแรกที่กด แล้วค้างโชว์ต่อไป ไม่ toggle กลับตามชิปที่เปิด/ปิดอยู่ ณ ขณะนั้น
    onInteract?.();
    const chipKey = `${source}-${courseId}`;
    setOpenChipKeys((prev) => {
      const next = new Set(prev);
      if (next.has(chipKey)) next.delete(chipKey);
      else next.add(chipKey);
      return next;
    });
    if (!enrolledByCourseId[courseId]) {
      setEnrolledByCourseId((prev) => ({ ...prev, [courseId]: { status: "loading", students: [] } }));
      getCourseEnrolledStudents(courseId, cohortYear)
        .then((students) => {
          // เรียงตามรหัสนักศึกษาน้อยไปมากตามค่าตัวเลขจริงเสมอ (numeric ไม่ใช่ string/localeCompare -
          // string sort จะพังถ้ารหัสยาวไม่เท่ากัน เช่น "9" ไปอยู่หลัง "10") - backend endpoint นี้ไม่ได้
          // sort ตามรหัสมาให้ (sort ตามชื่อ) จึงต้อง sort ใหม่ฝั่งนี้เสมอ ไม่พึ่งลำดับที่ backend ส่งมา
          const sorted = [...students].sort((a, b) => Number(a.id) - Number(b.id));
          setEnrolledByCourseId((prev) => ({ ...prev, [courseId]: { status: "ready", students: sorted } }));
        })
        .catch(() => {
          setEnrolledByCourseId((prev) => ({ ...prev, [courseId]: { status: "error", students: [] } }));
        });
    }
  }

  return (
    <div className="plo-course-breakdown">
      <div className="plo-linked-courses">
        <div className="plo-course-breakdown-header">
          <span className="plo-course-breakdown-label">
            วิชาตามแผนหลักสูตร (มคอ.2)
            <Info size={13} strokeWidth={2} title="ข้อมูลจากแผนหลักสูตรตอนออกแบบ (course_plo) - คนละอันกับวิชาที่ผูกจริงตอนสอนด้านล่าง" />
          </span>
          <label className="plo-cohort-prefix-filter">
            รุ่น
            <select
              value={selectedCohortPrefix}
              onChange={(e) => setSelectedCohortPrefix(e.target.value)}
              title="กรองตารางนักศึกษาที่ลงทะเบียนด้วยรุ่น (เลข 2 หลักแรกของรหัสนักศึกษา) - กรองร่วมกับวิชาที่กำลังดูอยู่"
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
        {coursePlan.status === "loading" && <p className="loading-message">กำลังโหลดข้อมูล...</p>}
        {coursePlan.status === "error" && (
          <p className="error-message">โหลดรายชื่อวิชาไม่สำเร็จ ลองใหม่อีกครั้ง</p>
        )}
        {coursePlan.status === "ready" &&
          (coursePlan.courses.length === 0 ? (
            <p className="student-list-empty">หลักสูตรนี้ยังไม่ได้กำหนดวิชาให้ PLO ข้อนี้ในแผนหลักสูตร</p>
          ) : (
            <div className="plo-course-chip-row">
              {coursePlan.courses.map((c) => (
                <CourseChip
                  key={c.course_id}
                  course={c}
                  badge={RESPONSIBILITY_LABEL[c.responsibility_level] ?? c.responsibility_level}
                  isOpen={openChipKeys.has(`plan-${c.course_id}`)}
                  onToggle={() => toggleChip("plan", c.course_id)}
                  enrolled={enrolledByCourseId[c.course_id]}
                  cohortPrefix={selectedCohortPrefix}
                />
              ))}
            </div>
          ))}
      </div>

      <div className="plo-linked-courses">
        <span className="plo-course-breakdown-label">
          วิชาที่ผูกจริงจากการสอน (CLO)
          <Info size={13} strokeWidth={2} title="ข้อมูลจากการผูก CLO กับ PLO จริงของอาจารย์ขณะสอน (clo_plo_mapping) - คนละอันกับแผนหลักสูตรด้านบน" />
        </span>
        {linkedCourses.status === "loading" && <p className="loading-message">กำลังโหลดข้อมูล...</p>}
        {linkedCourses.status === "error" && (
          <p className="error-message">โหลดรายชื่อวิชาไม่สำเร็จ ลองใหม่อีกครั้ง</p>
        )}
        {linkedCourses.status === "ready" &&
          (linkedCourses.courses.length === 0 ? (
            <p className="student-list-empty">ยังไม่มีวิชาที่ผูก CLO จริงกับ PLO ข้อนี้</p>
          ) : (
            <div className="plo-course-chip-row">
              {linkedCourses.courses.map((c) => (
                <CourseChip
                  key={c.course_id}
                  course={c}
                  badge={`${c.clo_count} CLO`}
                  isOpen={openChipKeys.has(`clo-${c.course_id}`)}
                  onToggle={() => toggleChip("clo", c.course_id)}
                  enrolled={enrolledByCourseId[c.course_id]}
                  cohortPrefix={selectedCohortPrefix}
                />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
