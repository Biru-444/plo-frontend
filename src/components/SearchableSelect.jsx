import { useEffect, useRef, useState } from "react";

/**
 * Combobox พิมพ์ค้นหาได้ - แทนที่ <select> ธรรมดาตอนตัวเลือกมีเยอะ/ชื่อยาว (เช่น รายวิชา)
 * กรอง options ด้วย substring match กับ label แบบไม่สนตัวพิมพ์เล็กใหญ่ (ค้นได้ทั้งรหัส+ชื่อวิชา
 * ถ้า label ประกอบด้วยทั้งคู่ เช่น "4121302 การออกแบบและการพัฒนาเว็บไซต์")
 *
 * ค่าที่ผูกกับฟอร์ม/state ภายนอกยังเป็น value เดิม (id) เหมือน <select> ทุกประการ - onChange
 * ยิงเฉพาะตอนคลิกเลือกตัวเลือกจริงเท่านั้น พิมพ์เฉยๆ ไม่กดเลือกจะไม่เปลี่ยนค่าที่ผูกไว้
 *
 * options: [{ value, label }] - ใส่ตัวเลือก "-- ทั้งหมด --"/ว่างเปล่าเป็นแถวแรกของ options เอง
 * ถ้าต้องการ (ผู้เรียกกำหนดเอง ไม่ hardcode ไว้ในนี้)
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "พิมพ์เพื่อค้นหา...",
  emptyMessage = "ไม่พบรายการที่ค้นหา",
  id,
  required = false,
  disabled = false,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((o) => String(o.value) === String(value ?? ""));

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmed = query.trim().toLowerCase();
  const filteredOptions = trimmed
    ? options.filter((o) => o.label.toLowerCase().includes(trimmed))
    : options;

  function handleSelect(option) {
    onChange(option.value);
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div className={`searchable-select ${disabled ? "disabled" : ""}`} ref={containerRef}>
      <input
        id={id}
        type="text"
        value={isOpen ? query : selectedOption?.label ?? ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setIsOpen(false);
            setQuery("");
          }
        }}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
      />
      {isOpen && !disabled && (
        <ul className="searchable-select-options">
          {filteredOptions.length === 0 ? (
            <li className="searchable-select-empty">{emptyMessage}</li>
          ) : (
            filteredOptions.map((option) => (
              <li
                key={option.value}
                className={`searchable-select-option ${
                  String(option.value) === String(value ?? "") ? "selected" : ""
                }`}
                // mousedown (ไม่ใช่ click) กันไม่ให้ input เสีย focus/blur ปิด dropdown ไปก่อน onClick จะทำงาน
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(option);
                }}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
