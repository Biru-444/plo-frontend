import { useEffect, useState } from "react";
import { ChevronRight, Info, X } from "lucide-react";
import CourseCLOBreakdown from "./CourseCLOBreakdown.jsx";

/**
 * ไล่ดูผล "รายวิชา -> YLO (รายปี)" ของนักศึกษาคนเดียว ต่อจาก StudentProfileCard/PLOSummaryStats/
 * PLOChipGrid ในหน้า /student-plo (PLOAchievement.jsx) - เดิมหน้านี้เห็นแค่ % บรรลุ PLO ภาพรวม ไม่มีทาง
 * ไล่ลงไปดูว่าวิชาไหนผ่าน/ไม่ผ่าน หรือ YLO ปีไหนบรรลุหรือยัง (ต้องเดาจากคะแนนดิบเอง)
 * ข้อมูลมาจาก getStudentYLOAchievement (GET /ylo/achievement/student) - แยกจาก PLO ที่ยังคงดึงจาก
 * getStudentPLOAchievement เหมือนเดิม (คนละ endpoint, คนละ tier ของ hierarchy)
 *
 * แต่ละแถววิชากดขยายได้ (เฉพาะวิชาที่ลงทะเบียนแล้ว - ยังไม่ลงทะเบียนไม่มีคะแนนให้เจาะลึก) เพื่อดูว่า
 * CLO ข้อไหนผ่าน/ไม่ผ่าน และแต่ละ CLO คำนวณมาจากชิ้นงานไหนบ้าง (getStudentCourseCLOBreakdown) - โหลด
 * แบบ lazy ตอนกดขยายครั้งแรกเท่านั้น (ไม่โหลดล่วงหน้าทุกวิชาพร้อมกัน อาจมีเป็นสิบวิชาต่อหน้า) แล้ว cache
 * ไว้ในหน่วยความจำระหว่างเปิด-ปิดแถวเดิมซ้ำ
 *
 * selectedPloFilter/courseToPlos: ตอนกด PLO chip ฝั่งซ้าย (PLOChipGrid) กรองให้เหลือเฉพาะวิชาที่เป็น
 * primary ของ PLO ข้อนั้น - ปีที่ไม่เหลือวิชาเลยหลังกรองจะถูกซ่อนทั้งการ์ด (กันการ์ดว่างเปล่ารกจอ)
 * คำอธิบาย YLO ย้ายจากข้อความเต็มที่กางไว้ตลอด มาเป็น title tooltip ของไอคอน (i) แทน (ตามที่ตกลงกัน
 * 2026-09-08 - ประหยัดพื้นที่แนวตั้งสำหรับ one-screen dashboard)
 */
export default function StudentYearBreakdown({
  studentId,
  years,
  courseToPlos = {},
  selectedPloFilter = null,
  onClearFilter,
}) {
  const [expandedCourseIds, setExpandedCourseIds] = useState(() => new Set());

  useEffect(() => {
    setExpandedCourseIds(new Set());
  }, [studentId]);

  function toggleCourse(courseId) {
    setExpandedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  }

  if (!years || years.length === 0) return null;

  function coursesForYear(year) {
    if (!selectedPloFilter) return year.courses;
    return year.courses.filter((c) => courseToPlos[c.course_id]?.has(selectedPloFilter));
  }

  const visibleYears = years
    .map((year) => ({ year, visibleCourses: coursesForYear(year) }))
    .filter(({ visibleCourses }) => !selectedPloFilter || visibleCourses.length > 0);

  return (
    <div className="student-year-breakdown">
      <div className="student-year-breakdown-header">
        <h2 className="student-year-breakdown-title">รายวิชา และ YLO ตามชั้นปี</h2>
        {selectedPloFilter && (
          <button type="button" className="student-plo-filter-chip" onClick={onClearFilter}>
            กรอง: {selectedPloFilter}
            <X size={12} />
          </button>
        )}
      </div>

      {selectedPloFilter && visibleYears.length === 0 && (
        <p className="student-list-empty">ไม่มีวิชาที่เกี่ยวข้องกับ {selectedPloFilter} ในแผนการเรียน</p>
      )}

      <div className="student-year-list">
        {visibleYears.map(({ year, visibleCourses }) => (
          <div key={year.year_level} className="student-year-card">
            <div className="student-year-card-header">
              <h3>
                ชั้นปีที่ {year.year_level}
                {year.ylo_description && (
                  <Info size={12} className="student-year-ylo-info" title={year.ylo_description} />
                )}
              </h3>
              {year.is_reached ? (
                <span className={year.is_achieved ? "badge-pass" : "badge-fail"}>
                  {year.is_achieved ? "บรรลุ YLO" : "ยังไม่บรรลุ YLO"}
                </span>
              ) : (
                <span className="badge-muted">ยังไม่ถึงชั้นปีนี้</span>
              )}
            </div>

            {visibleCourses.length === 0 ? (
              <p className="student-list-empty">ยังไม่มีแผนการศึกษา (study plan) กำหนดไว้สำหรับชั้นปีนี้</p>
            ) : (
              <ul className="student-year-course-list">
                {visibleCourses.map((course) => {
                  const isExpanded = expandedCourseIds.has(course.course_id);
                  return (
                    <li key={course.course_id} className="student-year-course-block">
                      <div
                        className={`student-year-course-item ${course.is_enrolled ? "clickable" : ""}`}
                        onClick={course.is_enrolled ? () => toggleCourse(course.course_id) : undefined}
                      >
                        {course.is_enrolled && (
                          <ChevronRight
                            size={14}
                            className={`expand-icon-plain ${isExpanded ? "expanded" : ""}`}
                          />
                        )}
                        <span className="student-year-course-name">
                          {course.course_code} {course.name_th}
                        </span>
                        {course.is_enrolled ? (
                          <span className={course.passed ? "badge-pass" : "badge-fail"}>
                            {course.passed ? "ผ่าน" : "ไม่ผ่าน"}
                          </span>
                        ) : (
                          <span className="badge-muted">ยังไม่ลงทะเบียน</span>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="student-year-course-detail">
                          <CourseCLOBreakdown studentId={studentId} courseId={course.course_id} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
