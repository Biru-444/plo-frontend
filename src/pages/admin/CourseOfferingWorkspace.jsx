import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { UserPlus, ListChecks, PencilLine, Target } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import ScoresPanel from "../../components/ScoresPanel.jsx";
import CLOAchievementPanel from "../../components/CLOAchievementPanel.jsx";
import EnrollmentTab from "../../components/admin/course-offering-workspace/EnrollmentTab.jsx";
import StructureTab from "../../components/admin/course-offering-workspace/StructureTab.jsx";
import {
  listCourseOfferings,
  listCourses,
  listAssessmentItems,
  listItemCLO,
  listCLO,
  listEnrollments,
  listStudents,
} from "../../api/client.js";

const TABS = [
  {
    key: "enrollment",
    label: "นักศึกษาลงทะเบียน",
    icon: UserPlus,
    description: "ดู/เพิ่ม/ลบนักศึกษาที่ลงทะเบียนเรียนวิชานี้",
  },
  {
    key: "structure",
    label: "โครงสร้างการประเมิน",
    icon: ListChecks,
    description: "สร้าง CLO ของวิชา ผูกกับ PLO ที่เกี่ยวข้อง แล้วสร้างงานประเมิน (เช่น สอบกลางภาค, ควิซ) มาผูกกับ CLO ที่ต้องการวัด",
  },
  {
    key: "scores",
    label: "กรอกคะแนน",
    icon: PencilLine,
    description: "กรอกคะแนนนักศึกษาทั้งชั้นแบบตาราง (นักศึกษา × งานประเมิน)",
  },
  {
    key: "clo",
    label: "ผลบรรลุ CLO",
    icon: Target,
    description: "ดูว่านักศึกษาบรรลุ CLO แต่ละข้อกี่คน กี่เปอร์เซ็นต์",
  },
];

export default function CourseOfferingWorkspace() {
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [offerings, setOfferings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  const [activeTab, setActiveTab] = useState("enrollment");

  const [assessmentItems, setAssessmentItems] = useState([]);
  const [allCLOs, setAllCLOs] = useState([]);
  const [itemCLOs, setItemCLOs] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [allStudents, setAllStudents] = useState([]);

  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  useEffect(() => {
    if (!user) return;
    (isAdmin ? listCourseOfferings() : listCourseOfferings(user.id))
      .then(setOfferings)
      .catch(() => {});
    listCourses().then(setCourses).catch(() => {});
    listStudents().then(setAllStudents).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  useEffect(() => {
    const paramOfferingId = searchParams.get("offering_id");
    if (paramOfferingId) {
      setSelectedOfferingId(paramOfferingId);
      loadWorkspace(Number(paramOfferingId));
    }
    // เปิดตรงแท็บที่ระบุมาได้ (เช่น ลิงก์ "จัดการ CLO และเกณฑ์ผ่าน" จากหน้าหลักอาจารย์) - เช็คว่าเป็น
    // key ที่มีจริงก่อน กันลิงก์เก่า/query แปลกๆ พาไปแท็บที่ไม่มีอยู่
    const paramTab = searchParams.get("tab");
    if (paramTab && TABS.some((tab) => tab.key === paramTab)) {
      setActiveTab(paramTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const courseById = useMemo(() => {
    const map = {};
    courses.forEach((c) => (map[c.id] = c));
    return map;
  }, [courses]);

  const studentById = useMemo(() => {
    const map = {};
    allStudents.forEach((s) => (map[s.id] = s));
    return map;
  }, [allStudents]);

  // Label default ตัดปีการศึกษา/เทอม/หมู่ออก แสดงแค่ "<รหัสวิชา> <ชื่อวิชา>" - ต่อท้ายด้วย
  // (<ปี>/<เทอม>) หมู่ <หมู่> เฉพาะวิชาที่มีมากกว่า 1 การเปิดสอนในลิสต์นี้เท่านั้น (นับจาก course_id
  // ซ้ำกัน) เพื่อให้ยังแยกแยะได้เมื่อจำเป็น
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

  const selectedOffering = offerings.find((o) => o.id === Number(selectedOfferingId));
  const courseId = selectedOffering?.course_id;
  const curriculumId = courseById[courseId]?.curriculum_id;

  const courseCLOs = useMemo(
    () => allCLOs.filter((c) => c.course_id === courseId),
    [allCLOs, courseId]
  );

  async function loadWorkspace(offeringId) {
    setLoadingWorkspace(true);
    setWorkspaceError("");
    try {
      const [items, clos, allItemClo, offeringEnrollments] = await Promise.all([
        listAssessmentItems(offeringId),
        listCLO(),
        listItemCLO(),
        listEnrollments(offeringId),
      ]);
      setAssessmentItems(items);
      setAllCLOs(clos);
      const itemIds = new Set(items.map((i) => i.id));
      setItemCLOs(allItemClo.filter((ic) => itemIds.has(ic.item_id)));
      setEnrollments(offeringEnrollments);
    } catch {
      setWorkspaceError("โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
    } finally {
      setLoadingWorkspace(false);
    }
  }

  function handleSelectOffering(id) {
    setSelectedOfferingId(id);
    if (id) {
      loadWorkspace(Number(id));
    } else {
      setAssessmentItems([]);
      setAllCLOs([]);
      setItemCLOs([]);
      setEnrollments([]);
    }
  }

  async function refreshStructure() {
    const [items, allItemClo] = await Promise.all([
      listAssessmentItems(Number(selectedOfferingId)),
      listItemCLO(),
    ]);
    setAssessmentItems(items);
    const itemIds = new Set(items.map((i) => i.id));
    setItemCLOs(allItemClo.filter((ic) => itemIds.has(ic.item_id)));
  }

  async function refreshCLOs() {
    const clos = await listCLO();
    setAllCLOs(clos);
  }

  async function refreshItemCLOs() {
    const allItemClo = await listItemCLO();
    const itemIds = new Set(assessmentItems.map((i) => i.id));
    setItemCLOs(allItemClo.filter((ic) => itemIds.has(ic.item_id)));
  }

  async function refreshEnrollments() {
    const offeringEnrollments = await listEnrollments(Number(selectedOfferingId));
    setEnrollments(offeringEnrollments);
  }

  return (
    <div className="page">
      <h1>พื้นที่ทำงานต่อวิชา</h1>
      <p className="workspace-hint">
        เลือกวิชาที่เปิดสอนด้านล่าง เพื่อจัดการนักศึกษาที่ลงทะเบียน สร้างงานประเมิน กรอกคะแนน และดูผลบรรลุ CLO
        ของวิชานั้นทั้งหมดในหน้าเดียว
      </p>

      <div className="workspace-offering-select">
        <label htmlFor="offering-select">เลือกการเปิดสอนรายวิชา</label>
        <SearchableSelect
          id="offering-select"
          value={selectedOfferingId}
          onChange={handleSelectOffering}
          options={offeringOptions}
          placeholder="พิมพ์รหัสหรือชื่อวิชา..."
        />
      </div>

      {workspaceError && <p className="error-message">{workspaceError}</p>}

      {!selectedOfferingId && offerings.length === 0 && (
        <p className="student-list-empty">
          ยังไม่มีวิชาที่เปิดสอนให้จัดการ — ถ้าเป็นแอดมิน ไปที่ "จัดการระบบ" → "การเปิดสอนรายวิชา"
          เพื่อเปิดวิชาก่อน ถ้าเป็นอาจารย์ ให้ติดต่อแอดมินให้มอบหมายวิชาที่สอนให้
        </p>
      )}

      {!selectedOfferingId && offerings.length > 0 && (
        <div className="workspace-empty-state">
          <p>👆 เลือกวิชาที่เปิดสอนด้านบนเพื่อเริ่มต้น จะมี 4 แท็บให้ใช้งาน:</p>
          <ul>
            {TABS.map((tab) => (
              <li key={tab.key}>
                <tab.icon size={16} strokeWidth={2} />
                <span>
                  <strong>{tab.label}</strong> — {tab.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedOfferingId && !loadingWorkspace && (
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

          {activeTab === "enrollment" && (
            <EnrollmentTab
              offeringId={Number(selectedOfferingId)}
              curriculumId={curriculumId}
              enrollments={enrollments}
              studentById={studentById}
              allStudents={allStudents}
              onChanged={refreshEnrollments}
            />
          )}

          {activeTab === "structure" && (
            <StructureTab
              offeringId={Number(selectedOfferingId)}
              courseId={courseId}
              curriculumId={curriculumId}
              assessmentItems={assessmentItems}
              courseCLOs={courseCLOs}
              itemCLOs={itemCLOs}
              onStructureChanged={refreshStructure}
              onItemCLOChanged={refreshItemCLOs}
              onCLOChanged={refreshCLOs}
            />
          )}

          {activeTab === "scores" && <ScoresPanel offeringId={Number(selectedOfferingId)} />}

          {activeTab === "clo" && <CLOAchievementPanel offeringId={Number(selectedOfferingId)} />}
        </>
      )}

      {loadingWorkspace && <p>กำลังโหลด...</p>}
    </div>
  );
}

