/**
 * ทำอะไร : หน้าจัดการคะแนน PLO (route /scores) — ค้นหานักศึกษาด้วยรหัส แล้วดู/แก้คะแนนทุกชิ้นงานที่
 *          เคยมีคะแนนบันทึกไว้แบบตาราง (แก้ทีละแถว) บวกฟอร์มเพิ่มคะแนนชิ้นงานใหม่ที่ยังไม่เคยมี
 *
 * เชื่อมกับ : เรียก getStudentScores (โหลดตาราง), updateStudentScore (แก้ทีละแถว),
 *             createStudentScore (เพิ่มใหม่) — validateScore บังคับกฎเดียวกับที่ backend เช็คซ้ำอีก
 *             ชั้น (จำนวนเต็ม, ไม่ติดลบ, ไม่เกินคะแนนเต็ม) เพื่อแจ้ง error ให้ผู้ใช้เร็วโดยไม่ต้องรอ
 *             round-trip ไป backend ก่อน
 *
 * ถ้าแก้ : ถ้ามาจาก URL query param ?student_id=... (เช่น คลิก "แก้ไขคะแนนนักศึกษาคนนี้" จากหน้า
 *          /student-plo) จะค้นหาให้อัตโนมัติทันทีที่เปิดหน้า
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createStudentScore,
  getStudentScores,
  listAssessmentItems,
  updateStudentScore,
} from "../api/client.js";

export default function ScoreManagement() {
  const [searchParams] = useSearchParams();
  // ช่องค้นหา + รหัสนักศึกษาที่ค้นหาล่าสุดสำเร็จแล้ว (คนละตัวกัน - searchedStudentId ใช้เป็น "โหมด
  // แสดงผล" ว่ากำลังดูคะแนนของใครอยู่ ต่างจาก studentId ที่เปลี่ยนตามการพิมพ์ในช่องค้นหา)
  const [studentId, setStudentId] = useState("");
  const [searchedStudentId, setSearchedStudentId] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // สถานะของฟอร์ม "เพิ่มคะแนนใหม่" ด้านล่างตาราง
  const [assessmentItems, setAssessmentItems] = useState([]);
  const [newItemId, setNewItemId] = useState("");
  const [newScore, setNewScore] = useState("");
  const [addError, setAddError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);

  // สถานะการแก้ไขคะแนนทีละแถวในตาราง - editValues เก็บ {scoreId: ค่าที่พิมพ์อยู่ในช่อง} แยกจาก
  // scores (ข้อมูลจริงที่บันทึกแล้ว) เพื่อให้พิมพ์แก้ได้อิสระก่อนกด "บันทึก" โดยไม่กระทบตารางจริง
  const [editValues, setEditValues] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [rowError, setRowError] = useState({});

  // โหลดรายชื่อชิ้นงานทั้งหมดครั้งเดียวตอนเปิดหน้า (ใช้เป็นตัวเลือกใน dropdown ของฟอร์มเพิ่มคะแนนใหม่)
  useEffect(() => {
    listAssessmentItems()
      .then(setAssessmentItems)
      .catch(() => {
        // Add-score form just won't have options; the search/edit flow above still works.
      });
  }, []);

  // ถ้ามาจาก URL query param ?student_id=... (เช่น คลิกลิงก์จากหน้า /student-plo) ให้ค้นหาให้
  // อัตโนมัติทันทีที่เปิดหน้า - loadScores จงใจไม่ใส่ใน dependency array (สร้างใหม่ทุก render)
  useEffect(() => {
    const paramStudentId = searchParams.get("student_id");
    if (paramStudentId) {
      setStudentId(paramStudentId);
      setAddError(null);
      setAddSuccess(null);
      loadScores(paramStudentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ดึงคะแนนทั้งหมดของนักศึกษา id นี้ แล้วเตรียม editValues เริ่มต้น (ค่าปัจจุบันของแต่ละแถว) ให้
  // ช่องแก้ไขในตารางพร้อมใช้งานทันที
  async function loadScores(id) {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentScores(id);
      setScores(data);
      setSearchedStudentId(id);
      const initialEdits = {};
      data.forEach((score) => {
        initialEdits[score.id] = String(score.score_obtained);
      });
      setEditValues(initialEdits);
    } catch {
      setError("ดึงข้อมูลคะแนนไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
    } finally {
      setLoading(false);
    }
  }

  // ส่งฟอร์มค้นหา - เคลียร์ข้อความ error/success ของฟอร์มเพิ่มคะแนนทิ้งด้วย (กันข้อความเก่าค้างข้าม
  // นักศึกษาคนใหม่)
  function handleSearch(e) {
    e.preventDefault();
    const trimmed = studentId.trim();
    if (!trimmed) return;
    setAddError(null);
    setAddSuccess(null);
    loadScores(trimmed);
  }

  // คะแนนต้องเป็นจำนวนเต็ม ไม่ติดลบ และห้ามเกินคะแนนเต็มของชิ้นงานนั้น (เช่น คะแนนเต็ม 20 กรอก 100
  // ไม่ได้) - คืน error เป็น null ถ้าค่าถูกต้อง
  function validateScore(rawValue, totalScore) {
    const n = Number(rawValue);
    if (!Number.isInteger(n)) return "คะแนนต้องเป็นจำนวนเต็ม ไม่มีทศนิยม";
    if (n < 0) return "คะแนนต้องไม่ติดลบ";
    if (totalScore !== undefined && n > Number(totalScore)) {
      return `คะแนนเกินคะแนนเต็มของชิ้นงานนี้ (เต็ม ${totalScore})`;
    }
    return null;
  }

  // บันทึกค่าที่แก้ไขของแถวเดียว (validate ก่อนยิง API เสมอ) - error ของแถวนี้เก็บแยกต่อ scoreId ไม่
  // กระทบแถวอื่นที่กำลังแก้อยู่พร้อมกัน
  async function handleSaveRow(scoreId) {
    setRowError((prev) => ({ ...prev, [scoreId]: null }));
    const row = scores.find((s) => s.id === scoreId);
    const error = validateScore(editValues[scoreId], row?.total_score);
    if (error) {
      setRowError((prev) => ({ ...prev, [scoreId]: error }));
      return;
    }
    setSavingId(scoreId);
    try {
      const updated = await updateStudentScore(scoreId, Number(editValues[scoreId]));
      setScores((prev) =>
        prev.map((score) =>
          score.id === scoreId ? { ...score, score_obtained: updated.score_obtained } : score
        )
      );
    } catch (err) {
      setRowError((prev) => ({ ...prev, [scoreId]: err?.response?.data?.detail || "บันทึกไม่สำเร็จ" }));
    } finally {
      setSavingId(null);
    }
  }

  // เพิ่มคะแนนของชิ้นงานที่ยังไม่เคยมีคะแนนของนักศึกษาคนนี้ - 409 จาก backend (มีคะแนนอยู่แล้ว) ถูก
  // ดักแยกให้ข้อความชัดเจนกว่า error ทั่วไป (บอกให้ไปแก้ในตารางแทน ไม่ใช่เพิ่มซ้ำ)
  async function handleAddScore(e) {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);
    if (!searchedStudentId || !newItemId || newScore === "") return;

    const selectedItem = assessmentItems.find((item) => item.id === Number(newItemId));
    const error = validateScore(newScore, selectedItem?.total_score);
    if (error) {
      setAddError(error);
      return;
    }

    try {
      await createStudentScore({
        item_id: Number(newItemId),
        student_id: searchedStudentId,
        score_obtained: Number(newScore),
      });
      setAddSuccess("เพิ่มคะแนนสำเร็จ");
      setNewItemId("");
      setNewScore("");
      loadScores(searchedStudentId);
    } catch (err) {
      if (err.response?.status === 409) {
        setAddError(
          "มีคะแนนของชิ้นงานนี้สำหรับนักศึกษาคนนี้อยู่แล้ว กรุณาแก้ไขในตารางด้านบนแทนการเพิ่มใหม่"
        );
      } else {
        setAddError(err?.response?.data?.detail || "เกิดข้อผิดพลาดในการเพิ่มคะแนน");
      }
    }
  }

  return (
    <div className="page">
      <h1>จัดการคะแนน PLO</h1>

      <form onSubmit={handleSearch} className="search-form">
        <label htmlFor="score-student-id">รหัสนักศึกษา</label>
        <input
          id="score-student-id"
          type="text"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="เช่น 6500001"
        />
        <button type="submit" disabled={loading}>
          {loading ? "กำลังค้นหา..." : "ค้นหา"}
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}

      {searchedStudentId && !loading && !error && (
        <>
          <table className="student-table score-table">
            <thead>
              <tr>
                <th>ชิ้นงาน</th>
                <th>คะแนนที่ได้</th>
                <th>คะแนนเต็ม</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr key={score.id} className="student-table-row">
                  <td className="student-table-cell">{score.item_name}</td>
                  <td className="student-table-cell">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max={score.total_score}
                      className="score-input"
                      value={editValues[score.id] ?? ""}
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, [score.id]: e.target.value }))
                      }
                    />
                  </td>
                  <td className="student-table-cell">{score.total_score}</td>
                  <td className="student-table-cell">
                    <button
                      type="button"
                      onClick={() => handleSaveRow(score.id)}
                      disabled={savingId === score.id}
                    >
                      {savingId === score.id ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                    {rowError[score.id] && (
                      <p className="error-message score-row-error">{rowError[score.id]}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {scores.length === 0 && (
            <p className="student-list-empty">นักศึกษาคนนี้ยังไม่มีคะแนน</p>
          )}

          <div className="add-score-section">
            <h2>เพิ่มคะแนนใหม่</h2>
            <form onSubmit={handleAddScore} className="admin-form">
              <div className="form-field">
                <label htmlFor="new-item">ชิ้นงาน</label>
                <select
                  id="new-item"
                  value={newItemId}
                  onChange={(e) => setNewItemId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    เลือกชิ้นงาน
                  </option>
                  {assessmentItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (เต็ม {item.total_score})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="new-score">คะแนนที่ได้</label>
                <input
                  id="new-score"
                  type="number"
                  step="1"
                  min="0"
                  max={assessmentItems.find((item) => item.id === Number(newItemId))?.total_score}
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                  required
                />
              </div>

              <button type="submit">เพิ่มคะแนน</button>
            </form>

            {addError && <p className="error-message">{addError}</p>}
            {addSuccess && <p className="success-message">{addSuccess}</p>}
          </div>
        </>
      )}
    </div>
  );
}
