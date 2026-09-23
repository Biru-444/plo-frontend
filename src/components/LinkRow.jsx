import { useHref, useNavigate } from "react-router-dom";

/**
 * ทำอะไร : แถวตาราง (<tr>) ที่กดแล้วไปหน้าอื่นได้ ใช้แทน <Link className="student-table-row"> แบบเดิม
 *          ที่ render <a> เป็นลูกของ <tbody> โดยตรง (HTML ไม่ถูกต้อง -> React warning
 *          "validateDOMNesting: <a> cannot appear as a child of <tbody>")
 *
 * เชื่อมกับ : ใช้ใน StudentList.jsx, YLOStudentBreakdown.jsx, PLOCourseBreakdown.jsx,
 *             PLOCourseDetailPage.jsx — ลูกต้องเป็น <td className="student-table-cell"> เท่านั้น
 *             สไตล์ "กดได้" อยู่ที่ tr.student-table-row.link-row ใน index.css
 *
 * ถ้าแก้ : ยังรองรับพฤติกรรมแบบลิงก์ครบ — คลิกปกติ = เปลี่ยนหน้าใน SPA, Ctrl/Cmd+คลิก หรือคลิกเมาส์กลาง =
 *          เปิดแท็บใหม่, Tab มาโฟกัสแล้วกด Enter = เปลี่ยนหน้า ถ้าลบส่วนใดออก ผู้ใช้จะเสียความสามารถนั้นไป
 */
export default function LinkRow({ to, className = "", children }) {
  const navigate = useNavigate();
  const href = useHref(to);

  const openInNewTab = () => window.open(href, "_blank", "noopener");

  const handleClick = (event) => {
    // ถ้าผู้ใช้กำลังลากเลือกข้อความในแถว (เช่น คัดลอกรหัสนักศึกษา) ไม่ต้องเปลี่ยนหน้า
    if (window.getSelection()?.toString()) return;
    if (event.ctrlKey || event.metaKey) {
      openInNewTab();
      return;
    }
    navigate(to);
  };

  const handleAuxClick = (event) => {
    if (event.button === 1) openInNewTab();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      navigate(to);
    }
  };

  return (
    <tr
      role="link"
      tabIndex={0}
      className={`student-table-row link-row ${className}`.trim()}
      onClick={handleClick}
      onAuxClick={handleAuxClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </tr>
  );
}
