import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  listAssessmentItems,
  listEnrollments,
  listStudents,
  getOfferingStudentScores,
  updateStudentScore,
  createStudentScore,
} from "../api/client.js";

/**
 * "กรอกคะแนน" (นักศึกษา × งานประเมิน แบบตารางสเปรดชีต, บันทึกทีละช่องตอน blur + ปุ่ม "บันทึกทั้งหมด"
 * สำหรับที่เหลือ) - ย้ายมาจาก ScoresTab เดิมใน CourseOfferingWorkspace.jsx ให้เป็น component ใช้ร่วมกัน
 * ได้ (เดิมรับ props สำเร็จรูปจาก parent ที่โหลดไว้ให้ทั้งหมด ตอนนี้ self-contained รับแค่ offeringId
 * แล้ว fetch ข้อมูลของตัวเองทั้งหมด) ใช้ได้ทั้งจาก CourseOfferingWorkspace.jsx (อาจารย์) และ
 * AdminCourseGrading.jsx (แอดมิน) - logic การกรอก/บันทึกคะแนนเหมือนเดิมทุกประการ ไม่มีอะไรเปลี่ยน
 *
 * noItemsHint: ข้อความ empty-state ตอนวิชายังไม่มีงานประเมิน ปรับได้ต่อ caller เพราะแต่ละที่ชี้ทางแก้ไป
 * คนละหน้า (CourseOfferingWorkspace มีแท็บ "โครงสร้างการประเมิน" ในตัว แต่ AdminCourseGrading ไม่มี
 * ต้องชี้ไปหน้า /admin/assessment-items แทน) - ไม่ระบุ = ใช้ข้อความเดิมที่มีอยู่แล้ว
 */
export default function ScoresPanel({ offeringId, noItemsHint }) {
  const [assessmentItems, setAssessmentItems] = useState([]);
  const [studentById, setStudentById] = useState({});
  const [enrollments, setEnrollments] = useState([]);
  const [offeringScores, setOfferingScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSummary, setSaveSummary] = useState("");
  const [savingKeys, setSavingKeys] = useState(() => new Set());
  const [savedFlashKeys, setSavedFlashKeys] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    setSearch("");
    setDirty({});
    setSaveSummary("");
    setLoading(true);
    setLoadError("");

    Promise.all([
      listAssessmentItems(offeringId),
      listEnrollments(offeringId),
      getOfferingStudentScores(offeringId),
      listStudents(),
    ])
      .then(([items, offeringEnrollments, scores, students]) => {
        if (cancelled) return;
        setAssessmentItems(items);
        setEnrollments(offeringEnrollments);
        setOfferingScores(scores);
        setStudentById(Object.fromEntries(students.map((s) => [s.id, s])));
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

  async function refreshScores() {
    const scores = await getOfferingStudentScores(offeringId);
    setOfferingScores(scores);
  }

  const scoreByStudentItem = useMemo(() => {
    const map = {};
    offeringScores.forEach((s) => {
      map[`${s.student_id}_${s.item_id}`] = s;
    });
    return map;
  }, [offeringScores]);

  const roster = useMemo(() => {
    const list = enrollments
      .map((e) => studentById[e.student_id])
      .filter(Boolean)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
    );
  }, [enrollments, studentById, search]);

  function cellValue(studentId, itemId) {
    const key = `${studentId}_${itemId}`;
    if (dirty[key] !== undefined) return dirty[key].value;
    const existing = scoreByStudentItem[key];
    return existing ? String(existing.score_obtained) : "";
  }

  function handleCellChange(studentId, itemId, value) {
    const key = `${studentId}_${itemId}`;
    const existing = scoreByStudentItem[key];
    setDirty((prev) => ({
      ...prev,
      [key]: { studentId, itemId, value, scoreId: existing ? existing.id : null },
    }));
  }

  async function handleCellBlur(studentId, itemId) {
    const key = `${studentId}_${itemId}`;
    const entry = dirty[key];
    if (!entry || entry.value === "") return;
    setSavingKeys((prev) => new Set(prev).add(key));
    try {
      if (entry.scoreId) {
        await updateStudentScore(entry.scoreId, Number(entry.value));
      } else {
        await createStudentScore({
          item_id: entry.itemId,
          student_id: entry.studentId,
          score_obtained: Number(entry.value),
        });
      }
      setDirty((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSavedFlashKeys((prev) => new Set(prev).add(key));
      setTimeout(() => {
        setSavedFlashKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 1200);
      await refreshScores();
    } catch {
      // ทิ้ง entry ไว้ใน dirty ต่อไป - ผู้ใช้แก้/กด "บันทึกทั้งหมด" ใหม่ได้
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleSaveAll() {
    setSaving(true);
    setSaveSummary("");
    const entries = Object.values(dirty).filter((d) => d.value !== "");
    const results = await Promise.allSettled(
      entries.map((d) =>
        d.scoreId
          ? updateStudentScore(d.scoreId, Number(d.value))
          : createStudentScore({
              item_id: d.itemId,
              student_id: d.studentId,
              score_obtained: Number(d.value),
            })
      )
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    setSaveSummary(`บันทึกสำเร็จ ${succeeded} รายการ${failed > 0 ? `, ไม่สำเร็จ ${failed} รายการ` : ""}`);
    setDirty({});
    setSaving(false);
    await refreshScores();
  }

  const dirtyCount = Object.keys(dirty).length;

  if (loading) return <p className="loading-message">กำลังโหลดข้อมูล...</p>;

  return (
    <div className="workspace-section">
      <h2>กรอกคะแนน</h2>
      {loadError && <p className="error-message">{loadError}</p>}

      <div className="toolbar-search workspace-search-wrap">
        <Search size={16} />
        <input
          type="text"
          placeholder="ค้นหารหัส/ชื่อนักศึกษา..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="score-sheet-wrapper">
        <table className="score-sheet-table">
          <thead>
            <tr>
              <th className="score-sheet-student-cell">นักศึกษา</th>
              {assessmentItems.map((item) => (
                <th key={item.id}>
                  {item.name}
                  <br />/{item.total_score}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.map((student) => (
              <tr key={student.id}>
                <td className="score-sheet-student-cell">
                  {student.id} {student.first_name} {student.last_name}
                </td>
                {assessmentItems.map((item) => {
                  const key = `${student.id}_${item.id}`;
                  const inputClass = savedFlashKeys.has(key)
                    ? "score-input-saved"
                    : savingKeys.has(key)
                    ? "score-input-saving"
                    : "";
                  return (
                    <td key={item.id}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={item.total_score}
                        className={inputClass}
                        value={cellValue(student.id, item.id)}
                        onChange={(e) => handleCellChange(student.id, item.id, e.target.value)}
                        onBlur={() => handleCellBlur(student.id, item.id)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {roster.length === 0 && <p className="student-list-empty">ไม่พบนักศึกษาที่ตรงกับการค้นหา</p>}
      {assessmentItems.length === 0 && (
        <p className="student-list-empty">
          {noItemsHint ?? 'วิชานี้ยังไม่มีงานประเมิน - เพิ่มในแท็บ "โครงสร้างการประเมิน" ก่อน'}
        </p>
      )}

      <div className="workspace-inline-form">
        <button type="button" onClick={handleSaveAll} disabled={saving || dirtyCount === 0}>
          {saving ? "กำลังบันทึก..." : `บันทึกทั้งหมด${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
        </button>
        {saveSummary && <p className="success-message">{saveSummary}</p>}
      </div>
    </div>
  );
}
