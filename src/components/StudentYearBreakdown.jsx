import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { getStudentCourseCLOBreakdown } from "../api/client.js";

/**
 * ไล่ดูผล "รายวิชา -> YLO (รายปี)" ของนักศึกษาคนเดียว ต่อจาก StudentProfileCard/PLOSummaryStats/
 * PLORadarChart ในหน้า /student-plo (PLOAchievement.jsx) - ก่อนหน้านี้หน้านี้เห็นแค่ % บรรลุ PLO
 * ภาพรวม ไม่มีทางไล่ลงไปดูว่าวิชาไหนผ่าน/ไม่ผ่าน หรือ YLO ปีไหนบรรลุหรือยัง (ต้องเดาจากคะแนนดิบเอง)
 * ข้อมูลมาจาก getStudentYLOAchievement (GET /ylo/achievement/student) - แยกจาก PLO ที่ยังคงดึงจาก
 * getStudentPLOAchievement เหมือนเดิม (คนละ endpoint, คนละ tier ของ hierarchy)
 *
 * แต่ละแถววิชากดขยายได้ (เฉพาะวิชาที่ลงทะเบียนแล้ว - ยังไม่ลงทะเบียนไม่มีคะแนนให้เจาะลึก) เพื่อดูว่า
 * CLO ข้อไหนผ่าน/ไม่ผ่าน และแต่ละ CLO คำนวณมาจากชิ้นงานไหนบ้าง (getStudentCourseCLOBreakdown) - โหลด
 * แบบ lazy ตอนกดขยายครั้งแรกเท่านั้น (ไม่โหลดล่วงหน้าทุกวิชาพร้อมกัน อาจมีเป็นสิบวิชาต่อหน้า) แล้ว cache
 * ไว้ในหน่วยความจำระหว่างเปิด-ปิดแถวเดิมซ้ำ
 */
export default function StudentYearBreakdown({ studentId, years }) {
  const [expandedCourseIds, setExpandedCourseIds] = useState(() => new Set());
  const [courseDetails, setCourseDetails] = useState({});

  useEffect(() => {
    setExpandedCourseIds(new Set());
    setCourseDetails({});
  }, [studentId]);

  function toggleCourse(courseId) {
    setExpandedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
        if (!courseDetails[courseId]) {
          setCourseDetails((prevDetails) => ({ ...prevDetails, [courseId]: { status: "loading" } }));
          getStudentCourseCLOBreakdown(studentId, courseId)
            .then((data) =>
              setCourseDetails((prevDetails) => ({ ...prevDetails, [courseId]: { status: "ready", data } }))
            )
            .catch(() =>
              setCourseDetails((prevDetails) => ({ ...prevDetails, [courseId]: { status: "error" } }))
            );
        }
      }
      return next;
    });
  }

  if (!years || years.length === 0) return null;

  return (
    <div className="student-year-breakdown">
      <h2 className="student-year-breakdown-title">รายวิชา และ YLO ตามชั้นปี</h2>
      <div className="student-year-list">
        {years.map((year) => (
          <div key={year.year_level} className="student-year-card">
            <div className="student-year-card-header">
              <h3>ชั้นปีที่ {year.year_level}</h3>
              {year.is_reached ? (
                <span className={year.is_achieved ? "badge-pass" : "badge-fail"}>
                  {year.is_achieved ? "บรรลุ YLO" : "ยังไม่บรรลุ YLO"}
                </span>
              ) : (
                <span className="badge-muted">ยังไม่ถึงชั้นปีนี้</span>
              )}
            </div>

            {year.ylo_description && (
              <p className="student-year-ylo-desc">{year.ylo_description}</p>
            )}

            {year.courses.length === 0 ? (
              <p className="student-list-empty">ยังไม่มีแผนการศึกษา (study plan) กำหนดไว้สำหรับชั้นปีนี้</p>
            ) : (
              <ul className="student-year-course-list">
                {year.courses.map((course) => {
                  const isExpanded = expandedCourseIds.has(course.course_id);
                  const detail = courseDetails[course.course_id];
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
                          {(!detail || detail.status === "loading") && (
                            <p className="loading-message">กำลังโหลดข้อมูล...</p>
                          )}
                          {detail?.status === "error" && (
                            <p className="error-message">โหลดรายละเอียดไม่สำเร็จ ลองใหม่อีกครั้ง</p>
                          )}
                          {detail?.status === "ready" && detail.data.clos.length === 0 && (
                            <p className="student-list-empty">วิชานี้ยังไม่มี CLO กำหนดไว้</p>
                          )}
                          {detail?.status === "ready" &&
                            detail.data.clos.map((clo) => (
                              <div key={clo.clo_id} className="student-year-clo-block">
                                <div className="student-year-clo-header">
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
