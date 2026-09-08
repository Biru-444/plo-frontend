/**
 * ไล่ดูผล "รายวิชา -> YLO (รายปี)" ของนักศึกษาคนเดียว ต่อจาก StudentProfileCard/PLOSummaryStats/
 * PLORadarChart ในหน้า /student-plo (PLOAchievement.jsx) - ก่อนหน้านี้หน้านี้เห็นแค่ % บรรลุ PLO
 * ภาพรวม ไม่มีทางไล่ลงไปดูว่าวิชาไหนผ่าน/ไม่ผ่าน หรือ YLO ปีไหนบรรลุหรือยัง (ต้องเดาจากคะแนนดิบเอง)
 * ข้อมูลมาจาก getStudentYLOAchievement (GET /ylo/achievement/student) - แยกจาก PLO ที่ยังคงดึงจาก
 * getStudentPLOAchievement เหมือนเดิม (คนละ endpoint, คนละ tier ของ hierarchy)
 */
export default function StudentYearBreakdown({ years }) {
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
                {year.courses.map((course) => (
                  <li key={course.course_id} className="student-year-course-item">
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
