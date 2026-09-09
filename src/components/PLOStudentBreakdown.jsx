import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getStudentPLOCourseBreakdown } from "../api/client.js";
import CourseCLOBreakdown from "./CourseCLOBreakdown.jsx";
import {
  AchievementStatusFilter,
  PercentRangeFilter,
  SortSelect,
  StudentSearchBox,
  YearLevelFilter,
} from "./StudentFilterControls.jsx";
import { useStudentYearLevels } from "../hooks/useStudentYearLevels.js";
import {
  STUDENT_SORT_OPTIONS,
  compareStudentRows,
  matchesAchievementStatus,
  matchesPercentBucket,
  matchesSearch,
} from "../utils/studentFilters.js";

/**
 * Per-student breakdown table for one PLO, rendered under a PLOCohortBar
 * when it's expanded. Sorted ascending by achieved_percent so students who
 * need help float to the top. Each row expands (accordion, several at once,
 * same pattern as CourseOfferingWorkspace's CLO achievement table) to show
 * every course linked to this PLO with a pass/fail badge for that student
 * specifically - fetched lazily per row and cached, calling the same
 * /plo/{id}/students/{id}/course-breakdown endpoint that reuses
 * _student_passed_course_for_plo from plo_calculation.py, so this can never
 * drift from the "% บรรลุ" number shown on the row itself.
 *
 * แต่ละวิชาในลิสต์ที่ขยายออกมากดต่อได้อีกชั้น (2026-09-09) เพื่อดูว่า CLO ข้อไหนไม่ผ่านและมาจากคะแนน
 * ชิ้นงานไหน - reuse CourseCLOBreakdown ตัวเดียวกับที่หน้า /student-plo ใช้ (StudentYearBreakdown.jsx)
 * ไม่เขียนตรรกะ course -> CLO -> คะแนน แยกกันคนละชุด ให้สาย CLO<->รายวิชา<->YLO<->PLO เชื่อมกันทั้งระบบ
 * key ของ state การขยายชั้นนี้คือ "studentId:courseId" (คนละคีย์กับการขยายแถวนักศึกษาชั้นนอก) เพราะ
 * นักศึกษาหลายคนขยายพร้อมกันได้ แต่ละคนก็มีหลายวิชาให้ขยายพร้อมกันได้เช่นกัน
 *
 * ตัวกรอง/เรียงลำดับ (2026-09-09) - ค้นหา/สถานะบรรลุ/ช่วง % /ชั้นปีปัจจุบัน/เรียงลำดับ ทำงานร่วมกันแบบ
 * AND ทั้งหมด กรอง client-side จาก students ที่ parent (PLODetailPage) โหลดมาให้แล้ว (ตัวกรอง "เลือกรุ่น"
 * เดิมยังอยู่ใน parent เหมือนเดิม เพราะมันกระทบตัวเลขสรุปบน header ด้วย ส่วนตัวกรองชุดใหม่นี้กรองแค่ตาราง
 * รายชื่อ ไม่กระทบ header) ชั้นปีปัจจุบันไม่มีอยู่ใน achievement data ที่โหลดมาอยู่แล้ว จึง fetch เพิ่มผ่าน
 * useStudentYearLevels (ยังคง endpoint เดิม ไม่เพิ่ม backend ใหม่)
 */
export default function PLOStudentBreakdown({ ploId, students }) {
  const [expandedStudentIds, setExpandedStudentIds] = useState(new Set());
  // { [studentId]: { status: 'loading'|'ready'|'error', courses: [] } }
  const [breakdownByStudentId, setBreakdownByStudentId] = useState({});
  const [expandedCourseKeys, setExpandedCourseKeys] = useState(() => new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [achievementFilter, setAchievementFilter] = useState("all");
  const [percentBucket, setPercentBucket] = useState("all");
  const [yearLevelFilter, setYearLevelFilter] = useState(null);
  const [sortKey, setSortKey] = useState("percent-asc");
  const yearLevelByStudentId = useStudentYearLevels();

  function toggleCourse(studentId, courseId) {
    const key = `${studentId}:${courseId}`;
    setExpandedCourseKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const rows = useMemo(
    () =>
      students
        .map((student) => {
          const achievement = student.plo_achievements.find((item) => item.plo_id === ploId);
          if (!achievement) return null;
          return {
            studentId: student.student_id,
            studentName: student.student_name,
            achievedPercent: achievement.achieved_percent,
            isAchieved: achievement.is_achieved,
          };
        })
        .filter((row) => row !== null),
    [students, ploId]
  );

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (!matchesSearch(searchQuery, row.studentId, row.studentName)) return false;
      if (!matchesAchievementStatus(row.isAchieved, achievementFilter)) return false;
      if (!matchesPercentBucket(row.achievedPercent, percentBucket)) return false;
      if (yearLevelFilter !== null && yearLevelByStudentId?.[row.studentId] !== yearLevelFilter) {
        return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => compareStudentRows(a, b, sortKey));
  }, [rows, searchQuery, achievementFilter, percentBucket, yearLevelFilter, yearLevelByStudentId, sortKey]);

  if (rows.length === 0) {
    return <p className="student-list-empty">ไม่มีข้อมูลนักศึกษาสำหรับ PLO ข้อนี้</p>;
  }

  function toggleStudent(studentId) {
    setExpandedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
    if (!breakdownByStudentId[studentId]) {
      setBreakdownByStudentId((prev) => ({
        ...prev,
        [studentId]: { status: "loading", courses: [] },
      }));
      getStudentPLOCourseBreakdown(ploId, studentId)
        .then((courses) => {
          setBreakdownByStudentId((prev) => ({ ...prev, [studentId]: { status: "ready", courses } }));
        })
        .catch(() => {
          setBreakdownByStudentId((prev) => ({ ...prev, [studentId]: { status: "error", courses: [] } }));
        });
    }
  }

  return (
    <>
      <div className="student-filter-toolbar">
        <StudentSearchBox value={searchQuery} onChange={setSearchQuery} />
        <AchievementStatusFilter value={achievementFilter} onChange={setAchievementFilter} />
        <PercentRangeFilter value={percentBucket} onChange={setPercentBucket} />
        <YearLevelFilter value={yearLevelFilter} onChange={setYearLevelFilter} />
        <SortSelect value={sortKey} onChange={setSortKey} options={STUDENT_SORT_OPTIONS} />
      </div>

      {visibleRows.length === 0 ? (
        <p className="student-list-empty">ไม่พบนักศึกษาที่ตรงกับตัวกรองที่เลือก</p>
      ) : (
        <table className="student-table plo-breakdown-table">
          <thead>
            <tr>
              <th></th>
              <th>รหัสนักศึกษา</th>
              <th>ชื่อ-นามสกุล</th>
              <th>% บรรลุ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const isExpanded = expandedStudentIds.has(row.studentId);
              const breakdown = breakdownByStudentId[row.studentId];
              return (
                <Fragment key={row.studentId}>
                  <tr
                    className="student-table-row expandable"
                    onClick={() => toggleStudent(row.studentId)}
                  >
                    <td className="student-table-cell">
                      {isExpanded ? (
                        <ChevronDown size={16} color="var(--color-purple-600)" />
                      ) : (
                        <ChevronRight size={16} color="var(--color-purple-600)" />
                      )}
                    </td>
                    <td className="student-table-cell">{row.studentId}</td>
                    <td className="student-table-cell">{row.studentName}</td>
                    <td className="student-table-cell">{row.achievedPercent.toFixed(1)}%</td>
                    <td className="student-table-cell">
                      <span className={`plo-badge ${row.isAchieved ? "achieved" : "not-achieved"}`}>
                        {row.isAchieved ? "บรรลุ" : "ไม่บรรลุ"}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="student-table-detail-row">
                      <td colSpan={5}>
                        {breakdown?.status === "loading" && (
                          <p className="loading-message">กำลังโหลดข้อมูล...</p>
                        )}
                        {breakdown?.status === "error" && (
                          <p className="error-message">โหลดรายชื่อวิชาไม่สำเร็จ ลองใหม่อีกครั้ง</p>
                        )}
                        {breakdown?.status === "ready" &&
                          (breakdown.courses.length === 0 ? (
                            <p className="student-list-empty">ไม่มีวิชาที่เกี่ยวข้องกับ PLO ข้อนี้</p>
                          ) : (
                            <ul className="student-year-course-list">
                              {breakdown.courses.map((c) => {
                                const courseKey = `${row.studentId}:${c.course_id}`;
                                const isCourseExpanded = expandedCourseKeys.has(courseKey);
                                return (
                                  <li key={c.course_id} className="student-year-course-block">
                                    <div
                                      className="student-year-course-item clickable"
                                      onClick={() => toggleCourse(row.studentId, c.course_id)}
                                    >
                                      <ChevronRight
                                        size={14}
                                        className={`expand-icon-plain ${isCourseExpanded ? "expanded" : ""}`}
                                      />
                                      <span className="student-year-course-name">
                                        {c.course_code} {c.name_th}
                                      </span>
                                      <span className={`plo-badge ${c.passed ? "achieved" : "not-achieved"}`}>
                                        {c.passed ? "ผ่าน" : "ไม่ผ่าน"}
                                      </span>
                                    </div>
                                    {isCourseExpanded && (
                                      <div className="student-year-course-detail">
                                        <CourseCLOBreakdown studentId={row.studentId} courseId={c.course_id} />
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
