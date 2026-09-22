/**
 * ทำอะไร : หน้าจัดการรายวิชา (Course) — ส่วนบนเป็นตาราง+ฟอร์ม CrudManager ปกติสำหรับฟิลด์ของวิชาเอง
 *          (รหัส/ชื่อ/หน่วยกิต/หมวดวิชา) ส่วนล่างเป็นแผง "จัดการ CLO ของวิชา" ใหม่ - เลือกวิชาแล้วสร้าง/
 *          ลบ CLO ได้ในหน้าเดียวกัน ไม่ต้องสลับไปหน้า /admin/clo (ดู
 *          แผนการแก้ไขครั้งใหญ่-PLO-CLO.md Workstream 1 ข้อ 2 - บทบาทเปลี่ยนเป็นแอดมินสร้างทุกอย่าง
 *          ล่วงหน้า อาจารย์ไม่สร้าง CLO เองอีกต่อไป ดู CourseOfferingWorkspace.jsx ที่ถอดความสามารถนี้
 *          ออกไปแล้วคู่กัน)
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /courses (ส่วนบน) และ GET/POST/DELETE /clo (แผงล่าง) ผ่าน
 *             api/client.js — route มาจาก App.jsx เส้นทาง "/admin/course" (admin เท่านั้น) แผง CLO
 *             เป็น local state แยกจาก CrudManager ด้านบนทั้งหมด (เลือกวิชาเองอิสระ ไม่ผูกกับแถวที่กำลัง
 *             แก้ไขในตารางบน) - แก้ไขรายละเอียด CLO ที่มีอยู่แล้วแบบละเอียด (เช่นแก้คำอธิบาย/เกณฑ์ผ่าน)
 *             ยังทำที่ "/admin/clo" เหมือนเดิม แผงนี้ทำแค่สร้างใหม่แบบเร็ว + ลบ + ดูรายการ
 *
 * ถ้าแก้ : ลบวิชาจะ cascade ลบ course_plo/study_plan/course_offering/clo ที่อ้างถึงไปด้วยทั้งหมด
 *          (รวมถึง CLO ที่สร้างจากแผงล่างนี้ด้วย)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import {
  listCurricula,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  listCLO,
  createCLO,
  deleteCLO,
} from "../../api/client.js";

function CLOManagerPanel() {
  const [courseOptions, setCourseOptions] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [allClos, setAllClos] = useState([]);
  const [loadingClos, setLoadingClos] = useState(false);
  const [cloError, setCloError] = useState("");

  const cloRowIdRef = useRef(0);
  const [cloRows, setCloRows] = useState([]);
  const [savingCloRows, setSavingCloRows] = useState(false);

  useEffect(() => {
    listCourses().then((data) =>
      setCourseOptions(data.map((c) => ({ value: c.id, label: `${c.course_code} ${c.name_th}` })))
    );
  }, []);

  async function loadClos() {
    setLoadingClos(true);
    setCloError("");
    try {
      setAllClos(await listCLO());
    } catch {
      setCloError("โหลดรายชื่อ CLO ไม่สำเร็จ");
    } finally {
      setLoadingClos(false);
    }
  }

  useEffect(() => {
    if (selectedCourseId) loadClos();
  }, [selectedCourseId]);

  const courseClos = useMemo(
    () => allClos.filter((c) => String(c.course_id) === String(selectedCourseId)),
    [allClos, selectedCourseId]
  );

  // เลข CLO สูงสุดที่มีอยู่จริงแล้วในวิชานี้ (แพทเทิร์นเดียวกับที่ StructureTab เคยใช้ตอนอยู่ฝั่งอาจารย์)
  const existingCloNumberMax = useMemo(() => {
    let max = 0;
    courseClos.forEach((c) => {
      const match = /^CLO(\d+)$/i.exec(c.code ?? "");
      if (match) max = Math.max(max, Number(match[1]));
    });
    return max;
  }, [courseClos]);

  function handleSelectCourse(value) {
    setSelectedCourseId(value);
    setCloRows([]);
    setCloError("");
  }

  function addCloRow() {
    const rowId = cloRowIdRef.current++;
    setCloRows((prev) => [...prev, { rowId, description: "", threshold: "60", error: "" }]);
  }

  function removeCloRow(rowId) {
    setCloRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  function updateCloRow(rowId, field, value) {
    setCloRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value, error: "" } : r))
    );
  }

  function isValidThresholdInput(value) {
    if (value === "" || value === null || value === undefined) return false;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 && n <= 100;
  }

  async function handleSaveCloRows(e) {
    e.preventDefault();
    if (cloRows.length === 0 || savingCloRows) return;

    let hasInvalid = false;
    const validatedRows = cloRows.map((row) => {
      let error = "";
      if (!row.description.trim()) {
        error = "กรุณากรอกคำอธิบาย";
      } else if (!isValidThresholdInput(row.threshold)) {
        error = "เกณฑ์ผ่านต้องเป็นจำนวนเต็ม 0-100 (ไม่มีทศนิยม)";
      }
      if (error) hasInvalid = true;
      return { ...row, error };
    });
    if (hasInvalid) {
      setCloRows(validatedRows);
      return;
    }

    setSavingCloRows(true);
    const results = await Promise.allSettled(
      validatedRows.map((row, index) =>
        createCLO({
          course_id: Number(selectedCourseId),
          code: `CLO${existingCloNumberMax + index + 1}`,
          description: row.description.trim(),
          pass_threshold_percent: Number(row.threshold),
        })
      )
    );
    setSavingCloRows(false);

    const anyFailed = results.some((r) => r.status === "rejected");
    await loadClos();
    if (anyFailed) {
      setCloRows(
        validatedRows
          .map((row, index) => {
            const result = results[index];
            return result.status === "rejected"
              ? {
                  ...row,
                  error:
                    result.reason?.response?.data?.detail ||
                    "สร้าง CLO นี้ไม่สำเร็จ (รหัส CLO นี้อาจมีอยู่แล้วในวิชานี้)",
                }
              : null;
          })
          .filter(Boolean)
      );
      return;
    }
    setCloRows([]);
  }

  async function handleDeleteClo(id) {
    if (
      !window.confirm("ยืนยันการลบ CLO นี้? การลบจะลบการผูกกับ PLO/งานประเมินที่มีอยู่ทั้งหมดของ CLO นี้ไปด้วย")
    )
      return;
    try {
      await deleteCLO(id);
      await loadClos();
    } catch (err) {
      setCloError(err?.response?.data?.detail || "ลบ CLO ไม่สำเร็จ");
    }
  }

  return (
    <div className="workspace-section">
      <h2>จัดการ CLO ของวิชา</h2>
      <p className="workspace-hint-inline">
        เลือกวิชาแล้วสร้าง/ลบ CLO ได้ทันที (แก้ไขรายละเอียด CLO ที่มีอยู่แล้วแบบเจาะจง เช่นแก้คำอธิบาย
        ให้ไปที่หน้า "จัดการ CLO" แยก - ผูก CLO กับ PLO ไปที่หน้า "เชื่อมโยง CLO กับ PLO")
      </p>

      <div className="form-field">
        <label htmlFor="clo-panel-course">เลือกวิชา</label>
        <SearchableSelect
          id="clo-panel-course"
          value={selectedCourseId}
          onChange={handleSelectCourse}
          options={courseOptions}
          placeholder="พิมพ์ค้นหารายวิชา..."
        />
      </div>

      {cloError && <p className="error-message">{cloError}</p>}

      {selectedCourseId && (
        <>
          {loadingClos ? (
            <p className="workspace-hint-inline">กำลังโหลด...</p>
          ) : (
            <>
              <table className="student-table">
                <thead>
                  <tr>
                    <th>รหัส CLO</th>
                    <th>คำอธิบาย</th>
                    <th>เกณฑ์ผ่าน (%)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {courseClos.map((clo) => (
                    <tr key={clo.id} className="student-table-row">
                      <td className="student-table-cell">{clo.code}</td>
                      <td className="student-table-cell">{clo.description}</td>
                      <td className="student-table-cell">{clo.pass_threshold_percent}</td>
                      <td className="student-table-cell">
                        <button
                          type="button"
                          className="icon-btn-delete"
                          title="ลบ CLO"
                          onClick={() => handleDeleteClo(clo.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {courseClos.length === 0 && (
                <p className="student-list-empty">วิชานี้ยังไม่มี CLO - สร้างข้อแรกด้านล่างได้เลย</p>
              )}

              <form onSubmit={handleSaveCloRows} className="clo-multi-row-form">
                {cloRows.map((row, index) => {
                  const cloNumber = existingCloNumberMax + index + 1;
                  return (
                    <div key={row.rowId} className="clo-multi-row-wrapper">
                      <div className="workspace-inline-form clo-multi-row">
                        <span className="clo-multi-row-label">CLO{cloNumber}</span>
                        <div className="form-field">
                          <label htmlFor={`admin-clo-row-desc-${row.rowId}`}>คำอธิบาย</label>
                          <input
                            id={`admin-clo-row-desc-${row.rowId}`}
                            type="text"
                            value={row.description}
                            onChange={(e) => updateCloRow(row.rowId, "description", e.target.value)}
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor={`admin-clo-row-threshold-${row.rowId}`}>เกณฑ์ผ่าน (%)</label>
                          <input
                            id={`admin-clo-row-threshold-${row.rowId}`}
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={row.threshold}
                            onChange={(e) => updateCloRow(row.rowId, "threshold", e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          className="icon-btn-delete"
                          title="ลบแถวนี้"
                          onClick={() => removeCloRow(row.rowId)}
                        >
                          ×
                        </button>
                      </div>
                      {row.error && <p className="error-message clo-multi-row-error">{row.error}</p>}
                    </div>
                  );
                })}

                <div className="workspace-inline-form">
                  <button type="button" onClick={addCloRow}>
                    + เพิ่ม CLO
                  </button>
                  {cloRows.length > 0 && (
                    <button type="submit" disabled={savingCloRows}>
                      {savingCloRows ? "กำลังบันทึก..." : "บันทึก CLO ใหม่"}
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminCourse() {
  // ตัวเลือกหลักสูตรสำหรับ dropdown ในฟอร์ม
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  // โหลดรายชื่อหลักสูตรครั้งเดียวตอนเปิดหน้า
  useEffect(() => {
    listCurricula().then((data) =>
      setCurriculumOptions(data.map((c) => ({ value: c.id, label: `${c.name} (${c.year})` })))
    );
  }, []);

  const columns = [
    { key: "curriculum_id", label: "หลักสูตร", type: "select", options: curriculumOptions, required: true },
    { key: "course_code", label: "รหัสวิชา", type: "text", required: true },
    { key: "name_th", label: "ชื่อวิชา (ไทย)", type: "text", required: true },
    { key: "name_en", label: "ชื่อวิชา (อังกฤษ)", type: "text", nullable: true },
    { key: "credit", label: "หน่วยกิต", type: "number", min: 0, required: true },
    { key: "category", label: "หมวดวิชา", type: "text", nullable: true, filterable: true },
  ];

  return (
    <>
      <CrudManager
        title="จัดการรายวิชา"
        columns={columns}
        api={{ list: listCourses, create: createCourse, update: updateCourse, remove: deleteCourse }}
      />
      <CLOManagerPanel />
    </>
  );
}
