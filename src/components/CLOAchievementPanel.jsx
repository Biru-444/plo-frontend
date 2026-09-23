import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import {
  listAssessmentItems,
  listItemCLO,
  getOfferingCLOAchievement,
  exportOfferingCLOReport,
} from "../api/client.js";

// สร้าง <a> ชั่วคราวกดดาวน์โหลดเอง (เปิดเป็นลิงก์ตรงไม่ได้เพราะต้องแนบ Authorization header ผ่าน axios)
// ตั้งชื่อไฟล์ตามที่ backend ส่งมาใน Content-Disposition
function _triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * "ผลบรรลุ CLO" (สรุประดับชั้นเรียน + breakdown รายบุคคล×CLO, คลิกแถว CLO ขยายดูว่าดึงคะแนนจาก
 * ชิ้นงานประเมินใดบ้าง) - ย้ายมาจาก CLOTab เดิมใน CourseOfferingWorkspace.jsx ให้เป็น component
 * ใช้ร่วมกันได้ (self-contained รับแค่ offeringId แล้ว fetch ข้อมูลของตัวเองทั้งหมด) ใช้ได้ทั้งจาก
 * CourseOfferingWorkspace.jsx (อาจารย์) และ AdminCourseGrading.jsx (แอดมิน)
 *
 * noMappingHint: ข้อความ empty-state ตอน CLO ยังไม่ได้ผูกกับชิ้นงานประเมิน ปรับได้ต่อ caller (เหตุผล
 * เดียวกับ ScoresPanel.jsx - CourseOfferingWorkspace มีแท็บ "โครงสร้างการประเมิน" ในตัว แต่
 * AdminCourseGrading ต้องชี้ไปหน้า /admin/item-clo แทน) - ไม่ระบุ = ใช้ข้อความเดิมที่มีอยู่แล้ว
 *
 * ปุ่ม "Export ผลการบรรลุ CLO (Excel)" : ดาวน์โหลดผ่าน exportOfferingCLOReport (responseType: 'blob')
 * ใช้ target_rate เดียวกับค่าเริ่มต้นฝั่ง backend (70)
 */
export default function CLOAchievementPanel({ offeringId, noMappingHint }) {
  const [targetRate, setTargetRate] = useState("70");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function handleExport() {
    setExporting(true);
    setExportError("");
    try {
      const { blob, filename } = await exportOfferingCLOReport(offeringId, Number(targetRate) || 70);
      _triggerBlobDownload(blob, filename);
    } catch (err) {
      setExportError(err?.response?.data?.detail || "Export ไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setExporting(false);
    }
  }

  // ผล CLO ทั้งห้อง (สรุป+คะแนนรายบุคคล) จาก GET /clo-achievement
  const [cloAchievement, setCloAchievement] = useState(null);
  // mapping ชิ้นงาน<->CLO เฉพาะของ offering นี้ (กรองจากทั้งระบบด้วย itemIds ด้านล่าง) ใช้ตอนขยายแถว
  // CLO เพื่อโชว์ว่าดึงคะแนนจากชิ้นงานไหนบ้าง
  const [itemCLOs, setItemCLOs] = useState([]);
  const [assessmentItems, setAssessmentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // clo_id ของแถว CLO ที่กำลังขยายอยู่ - null = ไม่มีแถวไหนขยาย (ขยายได้ทีละแถวเท่านั้น)
  const [expandedCloId, setExpandedCloId] = useState(null);

  // โหลดชิ้นงาน + mapping ชิ้นงาน<->CLO ทั้งระบบ + ผล CLO ทั้งห้อง พร้อมกันทุกครั้งที่เปลี่ยน offering
  // (listItemCLO() ไม่รับ filter ต่อ offering ได้ จึงต้องดึงทั้งหมดมาแล้วกรองเหลือเฉพาะของ offering
  // นี้เองฝั่ง frontend ด้วย itemIds)
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

  // ยังไม่มีใครมีคะแนนเลยสักชิ้นในทุก CLO - ปุ่ม export ยังกดได้ แค่เตือนว่าไฟล์จะออกมาเป็นค่าว่างเปล่า
  const hasNoScoresAtAll = clo_achievements.every((c) => c.passed_count + c.failed_count === 0);

  return (
    <>
      <div className="workspace-section">
        <h2>Export รายงานผลบรรลุ CLO</h2>
        <div className="workspace-inline-form">
          <label htmlFor="clo-report-target-rate">
            เกณฑ์บรรลุระดับรายวิชา (%)
            <input
              id="clo-report-target-rate"
              type="number"
              min="0"
              max="100"
              value={targetRate}
              onChange={(e) => setTargetRate(e.target.value)}
            />
          </label>
          <button type="button" onClick={handleExport} disabled={exporting}>
            <Download size={16} strokeWidth={2} />
            {exporting ? "กำลังสร้างไฟล์..." : "Export ผลการบรรลุ CLO (Excel)"}
          </button>
        </div>
        {hasNoScoresAtAll && (
          <p className="workspace-hint-inline">
            ยังไม่มีคะแนนบันทึกไว้เลยสักชิ้น - ไฟล์ที่ได้จะมีแต่ตารางเปล่า
          </p>
        )}
        {exportError && <p className="error-message">{exportError}</p>}
      </div>

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
