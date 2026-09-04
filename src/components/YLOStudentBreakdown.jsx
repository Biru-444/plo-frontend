import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * Per-student pass/fail table for one YLO, shown when the hero donut is
 * clicked. YLO achievement is all-or-nothing (no partial score like PLO's
 * average_achieved_percent used to be) so the "% บรรลุ" column is just
 * 100.0/0.0 mirroring is_achieved - same visual language as PLOStudentBreakdown,
 * kept as its own small component instead of reusing that one since the data
 * shape here has no plo_id/achieved_percent to look up.
 */
export default function YLOStudentBreakdown({ students }) {
  if (students.length === 0) {
    return <p className="student-list-empty">ไม่มีข้อมูลนักศึกษาสำหรับชั้นปีนี้</p>;
  }

  const rows = [...students].sort((a, b) => {
    if (a.is_achieved !== b.is_achieved) return a.is_achieved ? 1 : -1;
    return a.student_name.localeCompare(b.student_name, "th");
  });

  return (
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
        {rows.map((row) => (
          <Link
            key={row.student_id}
            to={`/student-plo?student_id=${encodeURIComponent(row.student_id)}`}
            className="student-table-row"
          >
            <span className="student-table-cell">{row.student_id}</span>
            <span className="student-table-cell">{row.student_name}</span>
            <span className="student-table-cell">{row.is_achieved ? "100.0%" : "0.0%"}</span>
            <span className="student-table-cell">
              <span className={`plo-badge ${row.is_achieved ? "achieved" : "not-achieved"}`}>
                {row.is_achieved ? "บรรลุ" : "ไม่บรรลุ"}
              </span>
            </span>
            <span className="student-table-cell student-row-arrow-cell">
              <ChevronRight size={16} color="var(--color-purple-600)" />
            </span>
          </Link>
        ))}
      </tbody>
    </table>
  );
}
