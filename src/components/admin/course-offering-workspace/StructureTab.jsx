import { useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  createAssessmentItem,
  deleteAssessmentItem,
  createItemCLO,
  deleteItemCLO,
  createCLO,
  deleteCLO,
} from "../../../api/client.js";

const ASSESSMENT_TYPE_OPTIONS = ["quiz", "midterm", "final", "assignment", "project"];
const ASSESSMENT_TYPE_LABELS = {
  quiz: "แบบทดสอบย่อย (Quiz)",
  midterm: "สอบกลางภาค (Midterm)",
  final: "สอบปลายภาค (Final)",
  assignment: "งานที่มอบหมาย (Assignment)",
  project: "โปรเจกต์ (Project)",
};

export default function StructureTab({
  offeringId,
  courseId,
  curriculumId,
  assessmentItems,
  courseCLOs,
  itemCLOs,
  onStructureChanged,
  onItemCLOChanged,
  onCLOChanged,
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState(ASSESSMENT_TYPE_OPTIONS[0]);
  const [totalScore, setTotalScore] = useState("");
  const [itemError, setItemError] = useState("");

  const [mapItemId, setMapItemId] = useState("");
  const [mapCloId, setMapCloId] = useState("");
  const [mapWeight, setMapWeight] = useState("");
  const [mapError, setMapError] = useState("");

  // --- สร้าง CLO หลายแถวพร้อมกัน (batch) - ไม่มีการผูก PLO ต่อ CLO ในหน้านี้อีกต่อไป (ผูกที่ระดับวิชา
  // แยกต่างหากผ่านหน้า "เชื่อมโยงรายวิชากับ PLO") - code เป็น "CLO{n}" auto-generate จากตำแหน่งแถว ไม่
  // ให้พิมพ์เอง - n เริ่มต่อจากเลข CLO สูงสุดที่มีอยู่แล้วจริงในวิชานี้ (ไม่ใช่แค่ courseCLOs.length+1
  // เพราะถ้าเคยลบ CLO กลางๆ ทิ้งไป นับจำนวนเฉยๆ จะชน code เดิมที่ยังอยู่ได้ - ดู existingCloNumberMax
  // ด้านล่าง)
  const cloRowIdRef = useRef(1); // 0 ถูกใช้โดยแถวเริ่มต้นด้านล่างไปแล้ว
  const [cloRows, setCloRows] = useState([{ rowId: 0, description: "", threshold: "", error: "" }]);
  const [savingCloRows, setSavingCloRows] = useState(false);
  const [cloFormError, setCloFormError] = useState("");

  const itemById = useMemo(() => {
    const map = {};
    assessmentItems.forEach((i) => (map[i.id] = i));
    return map;
  }, [assessmentItems]);

  const cloById = useMemo(() => {
    const map = {};
    courseCLOs.forEach((c) => (map[c.id] = c));
    return map;
  }, [courseCLOs]);

  // น้ำหนักรวมที่ผูกกับแต่ละ CLO ไปแล้ว (จากงานประเมินทุกชิ้น) - ใช้เตือน/กันไม่ให้ผูกรวมเกิน 100%
  const cloWeightTotals = useMemo(() => {
    const totals = {};
    itemCLOs.forEach((ic) => {
      totals[ic.clo_id] = (totals[ic.clo_id] || 0) + Number(ic.weight_percent);
    });
    return totals;
  }, [itemCLOs]);

  const mapCloCurrentTotal = mapCloId ? cloWeightTotals[Number(mapCloId)] || 0 : 0;
  const mapCloRemainingWeight = Math.max(0, 100 - mapCloCurrentTotal);

  // เลข CLO สูงสุดที่มีอยู่จริงแล้วในวิชานี้ (จาก code ที่ตรงรูปแบบ "CLO<เลข>" เท่านั้น ไม่สนตัวพิมพ์เล็ก
  // ใหญ่ - code เก่าที่ตั้งชื่อไม่ตรงรูปแบบนี้เลยจะไม่ถูกนับ แต่ก็ไม่ชนกันเองอยู่แล้วเพราะ code ใหม่ที่สร้าง
  // จะเป็น "CLO{n}" เป๊ะทุกครั้ง) แถวใหม่แต่ละแถวได้เลขต่อจากนี้ +1, +2, ... ตามตำแหน่งในฟอร์ม
  const existingCloNumberMax = useMemo(() => {
    let max = 0;
    courseCLOs.forEach((c) => {
      const match = /^CLO(\d+)$/i.exec(c.code ?? "");
      if (match) max = Math.max(max, Number(match[1]));
    });
    return max;
  }, [courseCLOs]);

  function addCloRow() {
    const rowId = cloRowIdRef.current++;
    setCloRows((prev) => [...prev, { rowId, description: "", threshold: "", error: "" }]);
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

    // validate ทุกแถวก่อนยิง request ใดๆ เลย - ถ้ามีแถวไหนไม่ผ่าน แสดง error ที่แถวนั้นแล้วหยุด ไม่ต้อง
    // สร้างแถวที่ผ่านไปก่อนบางส่วน (กันสร้างครึ่งๆ กลางๆ จากข้อมูลที่ยังกรอกไม่ครบ)
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
          course_id: courseId,
          code: `CLO${existingCloNumberMax + index + 1}`,
          description: row.description.trim(),
          pass_threshold_percent: Number(row.threshold),
        })
      )
    );
    setSavingCloRows(false);

    const anyFailed = results.some((r) => r.status === "rejected");
    if (anyFailed) {
      // เหลือไว้เฉพาะแถวที่พลาด (แถวที่สำเร็จแล้วขึ้นในตารางด้านล่างไปแล้วจาก onCLOChanged() - ถ้าปล่อย
      // ให้ยังค้างอยู่ในฟอร์มด้วย กด "บันทึก" ซ้ำจะพยายามสร้างซ้ำด้วย code เดิมที่มีอยู่แล้ว ชนแน่นอน)
      // ไม่ล้างค่า description/threshold ของแถวที่พลาดทิ้ง ให้แก้แล้วกดบันทึกใหม่ได้เลยไม่ต้องพิมพ์ซ้ำ
      await onCLOChanged();
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

    await onCLOChanged();
    setCloRows([{ rowId: cloRowIdRef.current++, description: "", threshold: "", error: "" }]);
  }

  async function handleDeleteCLO(id) {
    if (
      !window.confirm("ยืนยันการลบ CLO นี้? การลบจะลบการผูกกับงานประเมินที่มีอยู่ทั้งหมดของ CLO นี้ไปด้วย")
    )
      return;
    try {
      await deleteCLO(id);
      await onCLOChanged();
    } catch (err) {
      setCloFormError(err?.response?.data?.detail || "ลบ CLO ไม่สำเร็จ");
    }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    setItemError("");
    if (!name.trim() || totalScore === "") return;
    const parsedTotal = Number(totalScore);
    if (!Number.isInteger(parsedTotal) || parsedTotal <= 0) {
      setItemError('"คะแนนเต็ม" ต้องเป็นจำนวนเต็มมากกว่า 0');
      return;
    }
    try {
      await createAssessmentItem({
        offering_id: offeringId,
        name: name.trim(),
        type,
        total_score: parsedTotal,
      });
      setName("");
      setTotalScore("");
      await onStructureChanged();
    } catch (err) {
      setItemError(err?.response?.data?.detail || "เพิ่มงานประเมินไม่สำเร็จ");
    }
  }

  async function handleDeleteItem(id) {
    if (!window.confirm("ยืนยันการลบงานประเมินนี้? การกระทำนี้ย้อนกลับไม่ได้")) return;
    try {
      await deleteAssessmentItem(id);
      await onStructureChanged();
    } catch {
      setItemError("ลบไม่สำเร็จ");
    }
  }

  async function handleAddMapping(e) {
    e.preventDefault();
    setMapError("");
    if (!mapItemId || !mapCloId || mapWeight === "") return;
    const parsedWeight = Number(mapWeight);
    if (!Number.isInteger(parsedWeight) || parsedWeight < 0 || parsedWeight > 100) {
      setMapError('"น้ำหนัก (%)" ต้องเป็นจำนวนเต็ม 0-100 (ไม่มีทศนิยม)');
      return;
    }
    const newTotal = mapCloCurrentTotal + parsedWeight;
    if (newTotal > 100) {
      setMapError(
        `น้ำหนักรวมของ ${cloById[Number(mapCloId)]?.code ?? "CLO นี้"} จะเกิน 100% ` +
          `(มีอยู่แล้ว ${mapCloCurrentTotal}% + ที่จะเพิ่ม ${parsedWeight}% = ${newTotal}%) ` +
          `ผูกได้อีกไม่เกิน ${mapCloRemainingWeight}%`
      );
      return;
    }
    try {
      await createItemCLO({
        item_id: Number(mapItemId),
        clo_id: Number(mapCloId),
        weight_percent: parsedWeight,
      });
      setMapItemId("");
      setMapCloId("");
      setMapWeight("");
      await onItemCLOChanged();
    } catch (err) {
      setMapError(err?.response?.data?.detail || "เพิ่ม mapping ไม่สำเร็จ (อาจมี mapping นี้อยู่แล้ว)");
    }
  }

  async function handleDeleteMapping(id) {
    if (!window.confirm("ยืนยันการลบ mapping นี้?")) return;
    try {
      await deleteItemCLO(id);
      await onItemCLOChanged();
    } catch {
      setMapError("ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <div className="workspace-section">
        <h2>CLO ของวิชานี้ (Course Learning Outcome)</h2>
        <p className="workspace-hint-inline">
          สร้าง CLO ของวิชาก่อน (จะมีกี่ข้อก็ได้) กำหนดเกณฑ์ผ่าน (%) ต่อข้อ จากนั้นค่อยไปสร้างงานประเมิน
          ผูกกับ CLO ในหัวข้อถัดไป (การเชื่อมโยงกับ PLO ทำที่ระดับวิชาผ่านหน้า "เชื่อมโยงรายวิชากับ PLO"
          แยกต่างหาก ไม่ใช่ตรงนี้)
        </p>
        {cloFormError && <p className="error-message">{cloFormError}</p>}

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
            {courseCLOs.map((clo) => (
              <tr key={clo.id} className="student-table-row">
                <td className="student-table-cell">{clo.code}</td>
                <td className="student-table-cell">{clo.description}</td>
                <td className="student-table-cell">{clo.pass_threshold_percent}</td>
                <td className="student-table-cell">
                  <button
                    type="button"
                    className="icon-btn-delete"
                    title="ลบ CLO"
                    onClick={() => handleDeleteCLO(clo.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {courseCLOs.length === 0 && (
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
                    <label htmlFor={`clo-row-desc-${row.rowId}`}>คำอธิบาย</label>
                    <input
                      id={`clo-row-desc-${row.rowId}`}
                      type="text"
                      value={row.description}
                      onChange={(e) => updateCloRow(row.rowId, "description", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`clo-row-threshold-${row.rowId}`}>เกณฑ์ผ่าน (%)</label>
                    <input
                      id={`clo-row-threshold-${row.rowId}`}
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
            <button type="submit" disabled={cloRows.length === 0 || savingCloRows}>
              {savingCloRows ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>

      <div className="workspace-section">
        <h2>งานประเมิน (Assessment Item)</h2>
        {itemError && <p className="error-message">{itemError}</p>}
        <table className="student-table">
          <thead>
            <tr>
              <th>ชื่องาน</th>
              <th>ประเภท</th>
              <th>คะแนนเต็ม</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assessmentItems.map((item) => (
              <tr key={item.id} className="student-table-row">
                <td className="student-table-cell">{item.name}</td>
                <td className="student-table-cell">{item.type}</td>
                <td className="student-table-cell">{item.total_score}</td>
                <td className="student-table-cell">
                  <button
                    type="button"
                    className="icon-btn-delete"
                    title="ลบ"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {assessmentItems.length === 0 && (
          <p className="student-list-empty">วิชานี้ยังไม่มีงานประเมิน</p>
        )}

        <form onSubmit={handleAddItem} className="workspace-inline-form">
          <div className="form-field">
            <label htmlFor="new-item-name">ชื่องาน</label>
            <input
              id="new-item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="new-item-type">ประเภท</label>
            <select id="new-item-type" value={type} onChange={(e) => setType(e.target.value)}>
              {ASSESSMENT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {ASSESSMENT_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="new-item-total">คะแนนเต็ม</label>
            <input
              id="new-item-total"
              type="number"
              step="1"
              min="1"
              value={totalScore}
              onChange={(e) => setTotalScore(e.target.value)}
              required
            />
          </div>
          <button type="submit">+ เพิ่มงานประเมิน</button>
        </form>
      </div>

      <div className="workspace-section">
        <h2>ผูกงานประเมินกับ CLO</h2>
        {mapError && <p className="error-message">{mapError}</p>}
        <table className="student-table">
          <thead>
            <tr>
              <th>ชื่องาน</th>
              <th>CLO</th>
              <th title="น้ำหนักคะแนนของชิ้นงานนี้ต่อ CLO นี้ - รวมทุกชิ้นงานที่ผูกกับ CLO เดียวกันควรเท่ากับ 100%">
                น้ำหนัก (%)
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itemCLOs.map((ic) => (
              <tr key={ic.id} className="student-table-row">
                <td className="student-table-cell">{itemById[ic.item_id]?.name ?? ic.item_id}</td>
                <td className="student-table-cell">{cloById[ic.clo_id]?.code ?? ic.clo_id}</td>
                <td className="student-table-cell">{ic.weight_percent}</td>
                <td className="student-table-cell">
                  <button
                    type="button"
                    className="icon-btn-delete"
                    title="ลบ"
                    onClick={() => handleDeleteMapping(ic.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {itemCLOs.length === 0 && (
          <p className="student-list-empty">วิชานี้ยังไม่มีการผูกงานประเมินกับ CLO</p>
        )}
        {courseCLOs.length === 0 && (
          <p className="workspace-hint-inline">
            วิชานี้ยังไม่มี CLO เลย - สร้าง CLO ในหัวข้อ "CLO ของวิชานี้" ด้านบนก่อน ถึงจะเลือกผูกที่นี่ได้
          </p>
        )}

        <form onSubmit={handleAddMapping} className="workspace-inline-form">
          <div className="form-field">
            <label htmlFor="map-item">งานประเมิน</label>
            <select
              id="map-item"
              value={mapItemId}
              onChange={(e) => setMapItemId(e.target.value)}
              required
            >
              <option value="" disabled>
                เลือกงานประเมิน
              </option>
              {assessmentItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="map-clo">CLO</label>
            <select
              id="map-clo"
              value={mapCloId}
              onChange={(e) => setMapCloId(e.target.value)}
              required
            >
              <option value="" disabled>
                เลือก CLO
              </option>
              {courseCLOs.map((clo) => (
                <option key={clo.id} value={clo.id}>
                  {clo.code}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="map-weight">น้ำหนัก (%)</label>
            <input
              id="map-weight"
              type="number"
              step="1"
              min="0"
              max={mapCloId ? mapCloRemainingWeight : undefined}
              value={mapWeight}
              onChange={(e) => setMapWeight(e.target.value)}
              required
            />
          </div>
          <button type="submit">+ เพิ่ม mapping</button>
        </form>
        {mapCloId && (
          <p className="workspace-hint-inline">
            {cloById[Number(mapCloId)]?.code ?? "CLO นี้"} ผูกน้ำหนักไปแล้ว {mapCloCurrentTotal}%
            (ผูกเพิ่มได้อีกไม่เกิน {mapCloRemainingWeight}%)
          </p>
        )}
      </div>
    </>
  );
}
