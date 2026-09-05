import { useEffect } from "react";

/**
 * Modal เพิ่ม/แก้ไขแบบฟอร์มสั้นๆ ทั่วไป - หน้าตา/พฤติกรรมเหมือน modal ของ CrudManager.jsx ทุกจุด
 * (backdrop มืด, accent สีม่วงขอบบน, ปิดได้ด้วย ×/คลิกนอก/Esc, บล็อกปิดตอน saving) ใช้ CSS class
 * เดียวกันเป๊ะ (.crud-modal-backdrop, .crud-modal, .crud-form ฯลฯ) เพื่อความสอดคล้องกับทั้งแอป
 *
 * เขียนแยกจาก CrudManager.jsx เพราะ modal ของ CrudManager เป็น JSX ที่ผูกกับ state/handler ภายใน
 * component นั้นแน่นมาก (editingId, form, columns ทั้งชุด) ไม่ได้แยกเป็น component ที่ import ไปใช้
 * ที่อื่นได้ตรงๆ - รีแฟคเตอร์ CrudManager (ใช้ร่วมกับหน้า admin อื่นอีก ~15 หน้า) เพื่อแยกออกมาถือว่า
 * เสี่ยง regression เกินความจำเป็นสำหรับงานนี้ จึงเขียนใหม่ชิ้นเล็กๆ นี้แทน คัดลอกเฉพาะ CSS class
 * ไม่ได้สร้างสไตล์คู่ขนานใหม่
 *
 * fields: [{ key, label, type: 'text'|'number'|'select', options?: [{value,label}], required?: bool }]
 * values: object ค่าปัจจุบันของฟอร์ม (key -> value)
 */
export default function QuickFormModal({
  title,
  fields,
  values,
  onChange,
  onSubmit,
  onClose,
  saving,
  error,
}) {
  function requestClose() {
    if (saving) return;
    onClose();
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving]);

  return (
    <div className="crud-modal-backdrop" onClick={requestClose}>
      <div className="crud-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crud-modal-header">
          <h3>{title}</h3>
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

        <form className="crud-form" onSubmit={onSubmit}>
          {error && <p className="error-text">{error}</p>}
          {fields.map((f) => (
            <label key={f.key}>
              {f.label}
              {f.type === "select" ? (
                <select
                  value={values[f.key] ?? ""}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  required={f.required}
                >
                  <option value="">-- เลือก --</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  required={f.required}
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
  );
}
