import { Link } from "react-router-dom";

/**
 * Per-student breakdown table for one PLO, rendered under a PLOCohortBar
 * when it's expanded. Sorted ascending by achieved_percent so students who
 * need help float to the top. Each row links to that student's individual
 * PLO Achievement page.
 */
export default function PLOStudentBreakdown({ ploId, students }) {
  const rows = students
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
    .filter((row) => row !== null)
    .sort((a, b) => a.achievedPercent - b.achievedPercent);

  if (rows.length === 0) {
    return <p className="student-list-empty">ไม่มีข้อมูลนักศึกษาสำหรับ PLO ข้อนี้</p>;
  }

  return (
    <table className="student-table plo-breakdown-table">
      <thead>
        <tr>
          <th>รหัสนักศึกษา</th>
          <th>ชื่อ-นามสกุล</th>
          <th>% บรรลุ</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
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
          </Link>
        ))}
      </tbody>
    </table>
  );
}
