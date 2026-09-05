import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getOfferingCLOAchievement } from "../api/client.js";

/**
 * "รายละเอียด CLO ของนักศึกษาคนนี้ในวิชานี้" - จุดเข้าใหม่จากการคลิกชื่อนักศึกษาในหน้า PLO Course
 * Detail (PLOCourseDetailPage.jsx) แทนที่จะไปหน้าโปรไฟล์ PLO ภาพรวม (/student-plo) ที่ไม่เจาะจงวิชา
 *
 * ใช้ getOfferingCLOAchievement(offeringId) endpoint เดียวกับที่ CourseOfferingWorkspace.jsx ใช้อยู่
 * แล้ว (ส่วน "คะแนนรายบุคคลต่อ CLO") แต่กรองเหลือแค่แถวของ student_id ที่ต้องการฝั่ง frontend ล้วนๆ
 * ไม่ต้องเพิ่ม parameter ใหม่ที่ backend เพราะ student_scores ของทุก CLO มีนักศึกษาทุกคนในวิชาอยู่แล้ว
 *
 * offering_id มาจาก field ใหม่ที่ GET /courses/{course_id}/enrolled-students เพิ่มให้ (ดู
 * PLOCourseDetailPage.jsx ที่ประกอบ URL นี้) - student_name ส่งผ่าน query param มาด้วยเพื่อโชว์หัวข้อ
 * ได้ทันทีไม่ต้องรอ fetch เพิ่ม (ถ้าไม่มีมาก็ fallback เป็น student_id เฉยๆ)
 */
export default function StudentCourseCLOPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const offeringId = searchParams.get("offering_id");
  const studentId = searchParams.get("student_id");
  const studentName = searchParams.get("student_name") || studentId;

  const [achievement, setAchievement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!offeringId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getOfferingCLOAchievement(Number(offeringId))
      .then((data) => {
        if (!cancelled) setAchievement(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("ดึงข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [offeringId]);

  const rows = achievement
    ? achievement.clo_achievements
        .map((clo) => {
          const score = clo.student_scores.find((s) => s.student_id === studentId);
          if (!score) return null;
          return {
            cloId: clo.clo_id,
            cloCode: clo.clo_code,
            description: clo.description,
            passThresholdPercent: clo.pass_threshold_percent,
            cloPercent: score.clo_percent,
            passed: score.passed,
          };
        })
        .filter(Boolean)
    : [];

  return (
    <div className="page">
      <button type="button" className="crud-back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} strokeWidth={2} />
        กลับ
      </button>

      <h1>
        ผลบรรลุ CLO: {studentName}
        {achievement && ` — ${achievement.course_name}`}
      </h1>

      {!offeringId && (
        <p className="error-message">ไม่พบพารามิเตอร์ offering_id ใน URL - กรุณากลับไปเลือกวิชาใหม่</p>
      )}
      {error && <p className="error-message">{error}</p>}
      {loading && <p className="loading-message">กำลังโหลดข้อมูล...</p>}

      {!loading && !error && achievement && (
        <div className="workspace-section">
          {rows.length === 0 ? (
            <p className="student-list-empty">วิชานี้ยังไม่มีข้อมูล CLO</p>
          ) : (
            <table className="student-table">
              <thead>
                <tr>
                  <th>รหัส CLO</th>
                  <th>คำอธิบาย</th>
                  <th>เกณฑ์ผ่าน (%)</th>
                  <th>คะแนนที่ได้ (%)</th>
                  <th>ผลลัพธ์</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.cloId} className="student-table-row">
                    <td className="student-table-cell">{row.cloCode}</td>
                    <td className="student-table-cell">{row.description}</td>
                    <td className="student-table-cell">{row.passThresholdPercent}</td>
                    <td className="student-table-cell">{row.cloPercent}%</td>
                    <td className="student-table-cell">
                      <span className={row.passed ? "badge-pass" : "badge-fail"}>
                        {row.passed ? "ผ่าน" : "ไม่ผ่าน"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
