import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, ArrowLeft } from "lucide-react";

/**
 * Generic CRUD manager: table + add/edit form (in a modal) + delete, ใช้ซ้ำได้ทุกตาราง
 * columns: [{ key, label, type: 'text'|'number'|'password'|'select', options?: [{value,label}],
 *             required?: bool, nullable?: bool, step?: string, omitIfEmptyOnUpdate?: bool,
 *             readOnly?: bool (ล็อกไม่ให้แก้ตอน editingId !== "new" - เช่น primary key ที่ตั้งได้ตอนสร้างครั้งเดียว)
 *             filterable?: bool (select column: default true, ใช้ options เดิม;
 *                                 text/number column: default false, ต้องระบุ true เอง - ตัวเลือกจะ derive จาก rows จริง) }]
 * groupBy?: { keys: string[], label: (values: Record<string, any>) => string } - ถ้าส่งมา
 *   จะแบ่งตารางเป็นกลุ่มย่อยตามค่าคอลัมน์ใน keys (เรียงน้อย->มาก) แต่ละกลุ่มมีหัวข้อจาก label()
 * api: { list, create, update?(ไม่ใส่ = ไม่มีปุ่มแก้ไข), remove }
 */
export default function CrudManager({
  title,
  columns,
  api,
  idField = "id",
  allowDelete = true,
  groupBy,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null); // null = ปิดฟอร์ม/modal, "new" = กำลังเพิ่ม
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({});

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

  function requestClose() {
    if (saving) return;
    cancelEdit();
  }

  useEffect(() => {
    if (editingId === null) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, saving]);

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

  const filterableColumns = columns.filter((c) =>
    c.type === "select" ? c.filterable !== false : c.filterable === true
  );

  const filterOptionsByKey = useMemo(() => {
    const map = {};
    filterableColumns.forEach((c) => {
      if (c.type === "select") {
        map[c.key] = c.options || [];
        return;
      }
      const unique = Array.from(
        new Set(rows.map((r) => r[c.key]).filter((v) => v !== null && v !== undefined && v !== ""))
      );
      unique.sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b), "th");
      });
      map[c.key] = unique.map((v) => ({ value: v, label: String(v) }));
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns]);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({});
  }

  const activeFilterCount = Object.values(filters).filter((v) => v).length;

  const filteredRows = rows.filter((row) =>
    Object.entries(filters).every(([key, val]) => !val || String(row[key]) === String(val))
  );

  const groups = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map();
    filteredRows.forEach((row) => {
      const keyValues = groupBy.keys.map((k) => row[k]);
      const mapKey = keyValues.join("||");
      if (!map.has(mapKey)) map.set(mapKey, { keyValues, rows: [] });
      map.get(mapKey).rows.push(row);
    });
    const groupsArr = Array.from(map.values());
    groupsArr.sort((a, b) => {
      for (let i = 0; i < a.keyValues.length; i++) {
        const av = a.keyValues[i];
        const bv = b.keyValues[i];
        const na = Number(av);
        const nb = Number(bv);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) {
          if (na !== nb) return na - nb;
        } else if (av !== bv) {
          return String(av).localeCompare(String(bv), "th");
        }
      }
      return 0;
    });
    return groupsArr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, filteredRows]);

  function displayValue(col, row) {
    if (col.type === "password") return "••••••";
    if (col.type === "select") {
      const opt = col.options?.find((o) => String(o.value) === String(row[col.key]));
      return opt ? opt.label : row[col.key];
    }
    return String(row[col.key] ?? "");
  }

  function renderTable(rowsForTable) {
    return (
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
          {rowsForTable.map((row) => (
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
                  <button
                    className="icon-btn-delete"
                    title="ลบ"
                    onClick={() => handleDelete(row)}
                    disabled={editingId !== null}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="crud-manager">
      <Link to="/admin" className="crud-back-link">
        <ArrowLeft size={14} strokeWidth={2} />
        กลับหน้าจัดการระบบ
      </Link>
      <div className="crud-header">
        <h2>{title}</h2>
        <button onClick={startCreate} disabled={editingId !== null}>
          + เพิ่ม
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {editingId !== null && (
        <div className="crud-modal-backdrop" onClick={requestClose}>
          <div className="crud-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crud-modal-header">
              <h3>{editingId === "new" ? `เพิ่ม${title}` : `แก้ไข${title}`}</h3>
              <button
                type="button"
                className="crud-modal-close"
                onClick={requestClose}
                disabled={saving}
                aria-label="ปิด"
              >
                ×
              </button>
            </div>

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
                <button type="button" onClick={requestClose} disabled={saving}>
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!loading && filterableColumns.length > 0 && (
        <div className="crud-filters">
          {filterableColumns.map((c) => (
            <label key={c.key}>
              {c.label}
              <select value={filters[c.key] ?? ""} onChange={(e) => handleFilterChange(c.key, e.target.value)}>
                <option value="">-- ทั้งหมด --</option>
                {filterOptionsByKey[c.key]?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters}>
              ล้างตัวกรอง
            </button>
          )}
        </div>
      )}

      {!loading && activeFilterCount > 0 && (
        <p className="crud-filter-summary">
          แสดง {filteredRows.length} จาก {rows.length} รายการ
        </p>
      )}

      {loading ? (
        <p>กำลังโหลด...</p>
      ) : groups ? (
        groups.map((group) => (
          <div className="crud-group" key={group.keyValues.join("||")}>
            <h3 className="crud-group-title">
              {groupBy.label(Object.fromEntries(groupBy.keys.map((k, i) => [k, group.keyValues[i]])))}
            </h3>
            {renderTable(group.rows)}
          </div>
        ))
      ) : (
        renderTable(filteredRows)
      )}
    </div>
  );
}
