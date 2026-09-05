import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { listAssessmentItems, listItemCLO, getOfferingCLOAchievement } from "../api/client.js";

/**
 * "ผลบรรลุ CLO" (สรุประดับชั้นเรียน + breakdown รายบุคคล×CLO, คลิกแถว CLO ขยายดูว่าดึงคะแนนจาก
 * ชิ้นงานประเมินใดบ้าง) - ย้ายมาจาก CLOTab เดิมใน CourseOfferingWorkspace.jsx ให้เป็น component
 * ใช้ร่วมกันได้ (self-contained รับแค่ offeringId แล้ว fetch ข้อมูลของตัวเองทั้งหมด) ใช้ได้ทั้งจาก
 * CourseOfferingWorkspace.jsx (อาจารย์) และ AdminCourseGrading.jsx (แอดมิน)
 *
 * noMappingHint: ข้อความ empty-state ตอน CLO ยังไม่ได้ผูกกับชิ้นงานประเมิน ปรับได้ต่อ caller (เหตุผล
 * เดียวกับ ScoresPanel.jsx - CourseOfferingWorkspace มีแท็บ "โครงสร้างการประเมิน" ในตัว แต่
 * AdminCourseGrading ต้องชี้ไปหน้า /admin/item-clo แทน) - ไม่ระบุ = ใช้ข้อความเดิมที่มีอยู่แล้ว
 */
export default function CLOAchievementPanel({ offeringId, noMappingHint }) {
  const [cloAchievement, setCloAchievement] = useState(null);
  const [itemCLOs, setItemCLOs] = useState([]);
  const [assessmentItems, setAssessmentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expandedCloId, setExpandedCloId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setExpandedCloId(null);

    Promise.all([
      listAssessmentItems(offeringId),
      listItemCLO(),
      getOfferingCLOAchievement(offeringId),
    ])
      .then(([items, allItemClo, achievement]) => {
        if (cancelled) return;
        setAssessmentItems(items);
        const itemIds = new Set(items.map((i) => i.id));
        setItemCLOs(allItemClo.filter((ic) => itemIds.has(ic.item_id)));
        setCloAchievement(achievement);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [offeringId]);

  const itemById = useMemo(() => {
    const map = {};
    assessmentItems.forEach((i) => (map[i.id] = i));
    return map;
  }, [assessmentItems]);

  if (loading) return <p className="loading-message">กำลังโหลดข้อมูล...</p>;
  if (loadError) return <p className="error-message">{loadError}</p>;
  if (!cloAchievement) return <p>กำลังโหลด...</p>;

  const { clo_achievements } = cloAchievement;

  if (clo_achievements.length === 0) {
    return (
      <div className="workspace-section">
        <p className="student-list-empty">วิชานี้ยังไม่มี CLO</p>
      </div>
    );
  }

  const allStudentRows = clo_achievements[0].student_scores.map((s) => ({
    student_id: s.student_id,
    student_name: s.student_name,
  }));

  return (
    <>
      <div className="workspace-section">
        <h2>สรุปผลบรรลุ CLO ระดับชั้นเรียน</h2>
        <p className="workspace-hint">คลิกแถว CLO เพื่อดูว่าดึงคะแนนมาจากชิ้นงานประเมินใดบ้าง</p>
        <table className="student-table">
          <thead>
            <tr>
              <th></th>
              <th>CLO</th>
              <th>รายละเอียด</th>
              <th>เกณฑ์ผ่าน (%)</th>
              <th>ผ่าน</th>
              <th>ไม่ผ่าน</th>
              <th>ร้อยละบรรลุ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clo_achievements.map((clo) => {
              const achieved = clo.achieved_rate_percent >= clo.pass_threshold_percent;
              const isExpanded = expandedCloId === clo.clo_id;
              const linkedItems = itemCLOs.filter((ic) => ic.clo_id === clo.clo_id);
              return (
                <Fragment key={clo.clo_id}>
                  <tr
                    className="student-table-row expandable"
                    onClick={() => setExpandedCloId(isExpanded ? null : clo.clo_id)}
                  >
                    <td className="student-table-cell">
                      {isExpanded ? (
                        <ChevronDown size={16} color="var(--color-purple-600)" />
                      ) : (
                        <ChevronRight size={16} color="var(--color-purple-600)" />
                      )}
                    </td>
                    <td className="student-table-cell">{clo.clo_code}</td>
                    <td className="student-table-cell">{clo.description}</td>
                    <td className="student-table-cell">{clo.pass_threshold_percent}</td>
                    <td className="student-table-cell">{clo.passed_count}</td>
                    <td className="student-table-cell">{clo.failed_count}</td>
                    <td className="student-table-cell">
                      {clo.achieved_rate_percent}%
                      {clo.students_without_data > 0 && (
                        <span className="workspace-muted">
                          (อีก {clo.students_without_data} คนยังไม่มีข้อมูล)
                        </span>
                      )}
                    </td>
                    <td className="student-table-cell">
                      <span className={achieved ? "badge-pass" : "badge-fail"}>
                        {achieved ? "บรรลุ" : "ยังไม่บรรลุ"}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="student-table-detail-row">
                      <td colSpan={8}>
                        {linkedItems.length === 0 ? (
                          <p className="student-list-empty">
                            {noMappingHint ??
                              'CLO นี้ยังไม่ได้ผูกกับชิ้นงานประเมินใดเลย - ไปเพิ่มใน "โครงสร้างการประเมิน"'}
                          </p>
                        ) : (
                          <ul className="clo-trace-list">
                            {linkedItems.map((ic) => (
                              <li key={ic.id}>
                                <span className="clo-trace-item-name">
                                  {itemById[ic.item_id]?.name ?? `item #${ic.item_id}`}
                                </span>
                                <span className="clo-trace-item-weight">
                                  น้ำหนัก {ic.weight_percent}%
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="workspace-section">
        <h2>คะแนนรายบุคคลต่อ CLO</h2>
        <div className="score-sheet-wrapper">
          <table className="score-sheet-table">
            <thead>
              <tr>
                <th className="score-sheet-student-cell">นักศึกษา</th>
                {clo_achievements.map((clo) => (
                  <th key={clo.clo_id}>{clo.clo_code}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allStudentRows.map((row) => (
                <tr key={row.student_id}>
                  <td className="score-sheet-student-cell">
                    {row.student_id} {row.student_name}
                  </td>
                  {clo_achievements.map((clo) => {
                    const s = clo.student_scores.find((s) => s.student_id === row.student_id);
                    return (
                      <td key={clo.clo_id}>
                        {s ? (
                          <>
                            {s.clo_percent}%{" "}
                            <span className={s.passed ? "badge-pass" : "badge-fail"}>
                              {s.passed ? "ผ่าน" : "ไม่ผ่าน"}
                            </span>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
