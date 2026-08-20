import { useEffect, useState } from "react";

/**
 * Generic CRUD manager: table + add/edit form + delete, ใช้ซ้ำได้ทุกตาราง
 * columns: [{ key, label, type: 'text'|'number'|'password'|'select', options?: [{value,label}],
 *             required?: bool, nullable?: bool, step?: string, omitIfEmptyOnUpdate?: bool,
 *             readOnly?: bool (ล็อกไม่ให้แก้ตอน editingId !== "new" - เช่น primary key ที่ตั้งได้ตอนสร้างครั้งเดียว) }]
 * api: { list, create, update?(ไม่ใส่ = ไม่มีปุ่มแก้ไข), remove }
 */
export default function CrudManager({ title, columns, api, idField = "id", allowDelete = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null); // null = ปิดฟอร์ม, "new" = กำลังเพิ่ม
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await api.list());
    } catch (err) {
      setError(err?.response?.data?.detail || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCreate() {
    const initial = {};
    columns.forEach((c) => (initial[c.key] = ""));
    setForm(initial);
    setEditingId("new");
  }

  function startEdit(row) {
    const initial = {};
    columns.forEach((c) => (initial[c.key] = row[c.key] ?? ""));
    setForm(initial);
    setEditingId(row[idField]);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({});
  }

  function handleChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildPayload() {
    const payload = {};
    columns.forEach((c) => {
      const raw = form[c.key];
      const isEmpty = raw === "" || raw === undefined;
      if (isEmpty && c.omitIfEmptyOnUpdate && editingId !== "new") {
        return; // ไม่ส่ง field นี้เลย -> backend คงค่าเดิมไว้ (เช่น รหัสผ่านไม่เปลี่ยน)
      }
      if (isEmpty) {
        payload[c.key] = c.nullable ? null : raw;
      } else if (c.type === "number") {
        payload[c.key] = Number(raw);
      } else {
        payload[c.key] = raw;
      }
    });
    return payload;
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload();
      if (editingId === "new") {
        await api.create(payload);
      } else {
        await api.update(editingId, payload);
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm("ยืนยันการลบ? การกระทำนี้ย้อนกลับไม่ได้")) return;
    setError("");
    try {
      await api.remove(row[idField]);
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || "ลบไม่สำเร็จ (อาจมีข้อมูลอื่นอ้างอิงอยู่)");
    }
  }

  function displayValue(col, row) {
    if (col.type === "password") return "••••••";
    if (col.type === "select") {
      const opt = col.options?.find((o) => String(o.value) === String(row[col.key]));
      return opt ? opt.label : row[col.key];
    }
    return String(row[col.key] ?? "");
  }

  return (
    <div className="crud-manager">
      <div className="crud-header">
        <h2>{title}</h2>
        <button onClick={startCreate} disabled={editingId !== null}>
          + เพิ่ม
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {editingId !== null && (
        <form className="crud-form" onSubmit={handleSave}>
          {columns.map((c) => (
            <label key={c.key}>
              {c.label}
              {c.type === "select" ? (
                <select
                  value={form[c.key] ?? ""}
                  onChange={(e) => handleChange(c.key, e.target.value)}
                  required={c.required}
                  disabled={c.readOnly && editingId !== "new"}
                >
                  <option value="">-- เลือก --</option>
                  {c.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={c.type === "number" ? "number" : c.type === "password" ? "password" : "text"}
                  step={c.step}
                  value={form[c.key] ?? ""}
                  onChange={(e) => handleChange(c.key, e.target.value)}
                  required={c.required && !(c.omitIfEmptyOnUpdate && editingId !== "new")}
                  placeholder={c.omitIfEmptyOnUpdate && editingId !== "new" ? "เว้นว่างถ้าไม่เปลี่ยน" : ""}
                  readOnly={c.readOnly && editingId !== "new"}
                />
              )}
            </label>
          ))}
          <div className="crud-form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button type="button" onClick={cancelEdit} disabled={saving}>
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>กำลังโหลด...</p>
      ) : (
        <table className="crud-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[idField]}>
                {columns.map((c) => (
                  <td key={c.key}>{displayValue(c, row)}</td>
                ))}
                <td>
                  {api.update && (
                    <button onClick={() => startEdit(row)} disabled={editingId !== null}>
                      แก้ไข
                    </button>
                  )}
                  {allowDelete && (
                    <button onClick={() => handleDelete(row)} disabled={editingId !== null}>
                      ลบ
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
