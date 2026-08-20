// เดียวกับ STATUS_BADGE_CLASS ใน StudentList.jsx - คง class เดิม (status-active ฯลฯ) ไว้
// เพื่อให้ badge ใช้ CSS ชุดเดียวกันทั้งสองหน้า แทนที่จะสร้าง selector ใหม่จากข้อความไทยตรงๆ
const STATUS_BADGE_CLASS = {
  กำลังศึกษา: "status-active",
  ลาออก: "status-dropped",
  พักการเรียน: "status-suspended",
  จบการศึกษา: "status-graduated",
};

export default function StudentProfileCard({ student, curriculumName }) {
  if (!student) return null;
  const fullName = [student.title, student.first_name, student.last_name]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="student-profile-card">
      <div className="student-profile-main">
        <h3>{fullName}</h3>
        <p className="student-profile-id">รหัสนักศึกษา: {student.id}</p>
      </div>
      <dl className="student-profile-meta">
        <div>
          <dt>หลักสูตร</dt>
          <dd>{curriculumName ?? `#${student.curriculum_id}`}</dd>
        </div>
        <div>
          <dt>รุ่น</dt>
          <dd>{student.cohort_year}</dd>
        </div>
        <div>
          <dt>ชั้นปีปัจจุบัน</dt>
          <dd>ปี {student.current_year_level}</dd>
        </div>
        <div>
          <dt>สถานะ</dt>
          <dd>
            <span className={`status-badge ${STATUS_BADGE_CLASS[student.status] ?? ""}`}>
              {student.status}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
