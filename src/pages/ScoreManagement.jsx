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
  const [studentId, setStudentId] = useState("");
  const [searchedStudentId, setSearchedStudentId] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [assessmentItems, setAssessmentItems] = useState([]);
  const [newItemId, setNewItemId] = useState("");
  const [newScore, setNewScore] = useState("");
  const [addError, setAddError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);

  const [editValues, setEditValues] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [rowError, setRowError] = useState({});

  useEffect(() => {
    listAssessmentItems()
      .then(setAssessmentItems)
      .catch(() => {
        // Add-score form just won't have options; the search/edit flow above still works.
      });
  }, []);

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

  function handleSearch(e) {
    e.preventDefault();
    const trimmed = studentId.trim();
    if (!trimmed) return;
    setAddError(null);
    setAddSuccess(null);
    loadScores(trimmed);
  }

  async function handleSaveRow(scoreId) {
    setSavingId(scoreId);
    setRowError((prev) => ({ ...prev, [scoreId]: null }));
    try {
      const updated = await updateStudentScore(scoreId, Number(editValues[scoreId]));
      setScores((prev) =>
        prev.map((score) =>
          score.id === scoreId ? { ...score, score_obtained: updated.score_obtained } : score
        )
      );
    } catch {
      setRowError((prev) => ({ ...prev, [scoreId]: "บันทึกไม่สำเร็จ" }));
    } finally {
      setSavingId(null);
    }
  }

  async function handleAddScore(e) {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);
    if (!searchedStudentId || !newItemId || newScore === "") return;

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
        setAddError("เกิดข้อผิดพลาดในการเพิ่มคะแนน");
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
                      step="0.01"
                      min="0"
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
                  step="0.01"
                  min="0"
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
