import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, PencilLine, Target } from "lucide-react";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import ScoresPanel from "../../components/ScoresPanel.jsx";
import CLOAchievementPanel from "../../components/CLOAchievementPanel.jsx";
import { listCourseOfferings, listCourses } from "../../api/client.js";

const TABS = [
  { key: "scores", label: "กรอกคะแนน", icon: PencilLine },
  { key: "clo", label: "ผลบรรลุ CLO", icon: Target },
];

/**
 * หน้าแอดมินสำหรับ "กรอกคะแนน" + "ผลบรรลุ CLO" ของวิชาที่เปิดสอนหนึ่งๆ - แทนที่ 2 ใน 4 แท็บของ
 * CourseOfferingWorkspace.jsx (เดิมแอดมินก็เข้าหน้านั้นได้เหมือนอาจารย์) ที่ไม่มีทางอื่นทดแทนถ้าซ่อน
 * เมนู "จัดการวิชาที่สอน" จาก sidebar ของแอดมิน (ดูการสำรวจก่อนงานนี้) ส่วน "นักศึกษาลงทะเบียน" และ
 * "โครงสร้างการประเมิน" ไม่ต้องทำหน้าซ้ำ เพราะแอดมินมี /admin/enrollments, /admin/clo,
 * /admin/assessment-items, /admin/item-clo ให้ใช้ครบอยู่แล้ว
 *
 * ใช้ ScoresPanel/CLOAchievementPanel ตัวเดียวกับที่ CourseOfferingWorkspace.jsx ใช้ (self-contained,
 * รับแค่ offeringId) - ไม่มี logic คำนวณ/แสดงผลของตัวเองเลย แค่ประกอบ SearchableSelect เลือกวิชา + tab
 * สลับ 2 panel เหมือน pattern เดิมของ workspace
 */
export default function AdminCourseGrading() {
  const [offerings, setOfferings] = useState([]);
  const [courses, setCourses] = useState([]);
  // offering (การเปิดสอนวิชา) ที่กำลังเลือกอยู่ใน dropdown - "" = ยังไม่ได้เลือก (ซ่อนแท็บทั้งหมด)
  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  // แท็บที่กำลังเปิดอยู่ - reset กลับเป็น "scores" ทุกครั้งที่เปลี่ยนวิชา (ดู handleSelectOffering)
  const [activeTab, setActiveTab] = useState("scores");

  // โหลดรายการวิชาที่เปิดสอนทั้งหมดและรายวิชาทั้งหมดครั้งเดียวตอนเปิดหน้า (ใช้ประกอบ label ของ
  // dropdown เลือกวิชา)
  useEffect(() => {
    listCourseOfferings().then(setOfferings).catch(() => {});
    listCourses().then(setCourses).catch(() => {});
  }, []);

  // แปลง courses array เป็น {courseId: course} เพื่อ lookup เร็ว - คำนวณใหม่เฉพาะตอน courses เปลี่ยน
  const courseById = useMemo(() => {
    const map = {};
    courses.forEach((c) => (map[c.id] = c));
    return map;
  }, [courses]);

  // pattern เดียวกับ offeringOptions ใน CourseOfferingWorkspace.jsx: label default ตัดปีการศึกษา/
  // เทอม/หมู่ออก ต่อท้ายเฉพาะวิชาที่มีมากกว่า 1 การเปิดสอนในลิสต์นี้
  const offeringOptions = useMemo(() => {
    const countByCourseId = {};
    offerings.forEach((o) => {
      countByCourseId[o.course_id] = (countByCourseId[o.course_id] || 0) + 1;
    });
    return [
      { value: "", label: "-- เลือกวิชา --" },
      ...offerings.map((o) => {
        const course = courseById[o.course_id];
        if (!course) return { value: o.id, label: `วิชา #${o.id}` };
        const base = `${course.course_code} ${course.name_th}`;
        const hasMultipleOfferings = countByCourseId[o.course_id] > 1;
        const label = hasMultipleOfferings
          ? `${base} (${o.academic_year}/${o.semester}) หมู่ ${o.section}`
          : base;
        return { value: o.id, label };
      }),
    ];
  }, [offerings, courseById]);

  // เปลี่ยนวิชาที่เลือก แล้วรีเซ็ตกลับไปแท็บ "กรอกคะแนน" เสมอ (กันค้างที่แท็บ CLO ของวิชาเก่าที่อาจไม่
  // เกี่ยวข้องกับวิชาใหม่ที่เพิ่งเลือก)
  function handleSelectOffering(id) {
    setSelectedOfferingId(id);
    setActiveTab("scores");
  }

  return (
    <div className="page">
      <Link to="/admin" className="crud-back-link">
        <ArrowLeft size={14} strokeWidth={2} />
        กลับหน้าจัดการระบบ
      </Link>
      <h1>กรอกคะแนน / ผลบรรลุ CLO</h1>
      <p className="workspace-hint">
        เลือกวิชาที่เปิดสอนด้านล่าง เพื่อกรอกคะแนนนักศึกษาทั้งชั้นแบบตาราง และดูผลบรรลุ CLO ของวิชานั้น
      </p>

      <div className="workspace-offering-select">
        <label htmlFor="grading-offering-select">เลือกการเปิดสอนรายวิชา</label>
        <SearchableSelect
          id="grading-offering-select"
          value={selectedOfferingId}
          onChange={handleSelectOffering}
          options={offeringOptions}
          placeholder="พิมพ์รหัสหรือชื่อวิชา..."
        />
      </div>

      {selectedOfferingId && (
        <>
          <div className="workspace-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`workspace-tab-btn ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <tab.icon size={16} strokeWidth={2} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "scores" && (
            <ScoresPanel
              offeringId={Number(selectedOfferingId)}
              noItemsHint='วิชานี้ยังไม่มีงานประเมิน - ไปเพิ่มที่หน้า "งานประเมิน" (/admin/assessment-items) ก่อน'
            />
          )}

          {activeTab === "clo" && (
            <CLOAchievementPanel
              offeringId={Number(selectedOfferingId)}
              noMappingHint='CLO นี้ยังไม่ได้ผูกกับชิ้นงานประเมินใดเลย - ไปเพิ่มที่หน้า "เชื่อมโยงงานประเมินกับ CLO" (/admin/item-clo)'
            />
          )}
        </>
      )}
    </div>
  );
}
