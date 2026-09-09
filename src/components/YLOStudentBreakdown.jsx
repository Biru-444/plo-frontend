import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
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
 * Per-student pass/fail table for one YLO, shown when the hero donut is
 * clicked. YLO achievement is all-or-nothing (no partial score like PLO's
 * average_achieved_percent used to be) so the "% บรรลุ" column is just
 * 100.0/0.0 mirroring is_achieved - same visual language as PLOStudentBreakdown,
 * kept as its own small component instead of reusing that one since the data
 * shape here has no plo_id/achieved_percent to look up.
 *
 * ตัวกรอง/เรียงลำดับ (2026-09-09) - component/utility เดียวกับที่ PLOStudentBreakdown.jsx ใช้
 * (StudentFilterControls.jsx, utils/studentFilters.js) เพื่อความสอดคล้องของทั้งสองหน้า ทำงานร่วมกันแบบ
 * AND ทั้งหมด กรอง client-side จาก students ที่ parent (YLOYearProgress.jsx) โหลดมาให้แล้ว
 */
export default function YLOStudentBreakdown({ students }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [achievementFilter, setAchievementFilter] = useState("all");
  const [percentBucket, setPercentBucket] = useState("all");
  const [yearLevelFilter, setYearLevelFilter] = useState(null);
  const [sortKey, setSortKey] = useState("id");
  const yearLevelByStudentId = useStudentYearLevels();

  const rows = useMemo(
    () =>
      students.map((s) => ({
        studentId: s.student_id,
        studentName: s.student_name,
        achievedPercent: s.is_achieved ? 100 : 0,
        isAchieved: s.is_achieved,
      })),
    [students]
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
    return <p className="student-list-empty">ไม่มีข้อมูลนักศึกษาสำหรับชั้นปีนี้</p>;
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
              <th>รหัสนักศึกษา</th>
              <th>ชื่อ-นามสกุล</th>
              <th>% บรรลุ</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <Link
                key={row.studentId}
                to={`/student-plo?student_id=${encodeURIComponent(row.studentId)}`}
                className="student-table-row"
              >
                <span className="student-table-cell">{row.studentId}</span>
                <span className="student-table-cell">{row.studentName}</span>
                <span className="student-table-cell">{row.achievedPercent.toFixed(1)}%</span>
                <span className="student-table-cell">
                  <span className={`plo-badge ${row.isAchieved ? "achieved" : "not-achieved"}`}>
                    {row.isAchieved ? "บรรลุ" : "ไม่บรรลุ"}
                  </span>
                </span>
                <span className="student-table-cell student-row-arrow-cell">
                  <ChevronRight size={16} color="var(--color-purple-600)" />
                </span>
              </Link>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
