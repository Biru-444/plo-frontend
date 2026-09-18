/**
 * ทำอะไร : พื้นที่ทำงานหลักของอาจารย์ต่อวิชาที่เปิดสอนหนึ่งวิชา (route /course-workspace) — เลือกวิชา
 *          จาก dropdown แล้วสลับ 4 แท็บ: นักศึกษาลงทะเบียน / โครงสร้างการประเมิน (CLO + งานประเมิน +
 *          mapping น้ำหนัก) / กรอกคะแนน / ผลบรรลุ CLO เป็นไฟล์ที่ใหญ่ที่สุดของโปรเจกต์เพราะรวมทุกงาน
 *          ประจำภาคเรียนของอาจารย์ไว้หน้าเดียว (ไม่ต้องสลับหน้าไปมาระหว่างทำงาน)
 *
 * เชื่อมกับ : แท็บ "กรอกคะแนน" และ "ผลบรรลุ CLO" ใช้ ScoresPanel/CLOAchievementPanel component ที่ถูก
 *             แยกออกมาให้ AdminCourseGrading.jsx (เวอร์ชันสำหรับ admin) ใช้ร่วมด้วย ส่วนแท็บ
 *             "นักศึกษาลงทะเบียน" ใช้ BulkEnrollPanel ร่วมกับ AdminEnrollments.jsx เช่นกัน — เหลือแค่
 *             แท็บ "โครงสร้างการประเมิน" (StructureTab ด้านล่าง) ที่ยังเป็นโค้ดเฉพาะของไฟล์นี้ เพราะไม่
 *             มีหน้าอื่นต้องการ workflow แบบเดียวกัน (สร้าง CLO หลายแถวพร้อมกัน + ผูกน้ำหนักในหน้าเดียว)
 *
 * ถ้าแก้ : เข้าหน้านี้พร้อม query param ?offering_id=...&tab=... ได้ (เช่นจากปุ่ม "จัดการ CLO และ
 *          เกณฑ์ผ่าน" ในหน้าหลักอาจารย์) เพื่อเปิดตรงวิชา/แท็บที่ต้องการทันที — เพิ่ม tab ใหม่ต้องเพิ่ม
 *          ใน TABS ด้านล่างด้วย ไม่งั้น query param tab จะถูกเมิน (เช็คด้วย TABS.some ก่อนตั้งค่า)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Trash2,
  UserPlus,
  ListChecks,
  PencilLine,
  Target,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import BulkEnrollPanel from "../../components/BulkEnrollPanel.jsx";
import ScoresPanel from "../../components/ScoresPanel.jsx";
import CLOAchievementPanel from "../../components/CLOAchievementPanel.jsx";
import {
  listCourseOfferings,
  listCourses,
  listAssessmentItems,
  createAssessmentItem,
  deleteAssessmentItem,
  listItemCLO,
  createItemCLO,
  deleteItemCLO,
  listCLO,
  createCLO,
  deleteCLO,
  listEnrollments,
  createEnrollment,
  deleteEnrollment,
  bulkEnrollByCohort,
  bulkRemoveByCohort,
  getSiblingSectionEnrollments,
  listStudents,
} from "../../api/client.js";

const ASSESSMENT_TYPE_OPTIONS = ["quiz", "midterm", "final", "assignment", "project"];
const ASSESSMENT_TYPE_LABELS = {
  quiz: "แบบทดสอบย่อย (Quiz)",
  midterm: "สอบกลางภาค (Midterm)",
  final: "สอบปลายภาค (Final)",
  assignment: "งานที่มอบหมาย (Assignment)",
  project: "โปรเจกต์ (Project)",
};

// นิยามแท็บทั้ง 4 ในที่เดียว - ใช้ทั้งวาดปุ่มแท็บและ empty-state (รายการ "จะมี 4 แท็บให้ใช้งาน")
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
  // วิชาที่เปิดสอนทั้งหมดที่ผู้ใช้นี้จัดการได้ (ของตัวเองถ้าเป็น instructor, ทั้งหมดถ้าเป็น admin) +
  // รายวิชาทั้งระบบ (ใช้ประกอบ label ของ dropdown) - คนละชุดกับข้อมูลเฉพาะวิชาที่เลือกอยู่ด้านล่าง
  const [offerings, setOfferings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  const [activeTab, setActiveTab] = useState("enrollment");

  // ข้อมูลเฉพาะของวิชาที่เลือกอยู่ในขณะนี้ - โหลดใหม่ทุกครั้งที่เปลี่ยนวิชา (ดู loadWorkspace)
  const [assessmentItems, setAssessmentItems] = useState([]);
  const [allCLOs, setAllCLOs] = useState([]);
  const [itemCLOs, setItemCLOs] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  // รายชื่อนักศึกษาทั้งระบบ (ไม่ใช่แค่ของวิชานี้) - โหลดครั้งเดียวตอนเปิดหน้า ใช้ทั้งประกอบชื่อคนที่
  // ลงทะเบียนแล้วและเป็นตัวเลือกตอนเพิ่มคนใหม่ (ดู EnrollmentTab)
  const [allStudents, setAllStudents] = useState([]);

  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  // โหลดรายการวิชาที่เปิดสอน + รายวิชาทั้งระบบ + นักศึกษาทั้งระบบ ครั้งเดียวตอนเปิดหน้า (หรือเมื่อ
  // user/isAdmin เปลี่ยน เช่น เพิ่ง login เสร็จ) - instructor เห็นเฉพาะวิชาที่ตัวเองสอน (กรองด้วย
  // user.id) ส่วน admin เห็นทุกวิชา
  useEffect(() => {
    if (!user) return;
    (isAdmin ? listCourseOfferings() : listCourseOfferings(user.id))
      .then(setOfferings)
      .catch(() => {});
    listCourses().then(setCourses).catch(() => {});
    listStudents().then(setAllStudents).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  // เปิดหน้านี้พร้อม query param ?offering_id=...&tab=... ได้ (เช่นจากปุ่มลัดในหน้าหลักอาจารย์) - โหลด
  // workspace ของวิชานั้นและเปิดตรงแท็บที่ระบุให้อัตโนมัติทันทีที่เข้าหน้า
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

  // แปลง courses/allStudents array เป็น map (id -> object) เพื่อ lookup เร็ว - ใช้ประกอบ label และ
  // ส่งต่อให้แท็บลูกใช้ (studentById ส่งลง EnrollmentTab)
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

  // ไล่จาก offering ที่เลือกอยู่ -> หาวิชา -> หาหลักสูตรของวิชานั้น (curriculumId ส่งลง EnrollmentTab
  // ใช้กรองนักศึกษาตอน "เพิ่มทั้งรุ่น")
  const selectedOffering = offerings.find((o) => o.id === Number(selectedOfferingId));
  const courseId = selectedOffering?.course_id;
  const curriculumId = courseById[courseId]?.curriculum_id;

  // CLO เฉพาะของวิชานี้ (allCLOs โหลดมาทั้งระบบเพราะ listCLO() ไม่รองรับ filter ต่อวิชา จึงกรองฝั่ง
  // frontend เอง)
  const courseCLOs = useMemo(
    () => allCLOs.filter((c) => c.course_id === courseId),
    [allCLOs, courseId]
  );

  // โหลดข้อมูลทั้งหมดของ offering หนึ่ง (งานประเมิน, CLO ทั้งระบบ, mapping ชิ้นงาน<->CLO กรองเหลือ
  // เฉพาะของ offering นี้, รายชื่อลงทะเบียน) - เรียกทุกครั้งที่เปลี่ยนวิชาที่เลือก
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

  // เปลี่ยนวิชาที่เลือก - โหลด workspace ใหม่ (หรือล้างข้อมูลทั้งหมดทิ้งถ้าเลือก "-- เลือกวิชา --")
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

  // โหลดงานประเมิน + mapping ชิ้นงาน<->CLO ของวิชานี้ใหม่ (เรียกหลังเพิ่ม/ลบงานประเมินสำเร็จ)
  async function refreshStructure() {
    const [items, allItemClo] = await Promise.all([
      listAssessmentItems(Number(selectedOfferingId)),
      listItemCLO(),
    ]);
    setAssessmentItems(items);
    const itemIds = new Set(items.map((i) => i.id));
    setItemCLOs(allItemClo.filter((ic) => itemIds.has(ic.item_id)));
  }

  // โหลด CLO ทั้งระบบใหม่ (เรียกหลังสร้าง/ลบ CLO สำเร็จ - courseCLOs ด้านบนจะกรองเหลือเฉพาะของวิชานี้เอง)
  async function refreshCLOs() {
    const clos = await listCLO();
    setAllCLOs(clos);
  }

  // โหลด mapping ชิ้นงาน<->CLO ใหม่ (เรียกหลังเพิ่ม/ลบ mapping สำเร็จ)
  async function refreshItemCLOs() {
    const allItemClo = await listItemCLO();
    const itemIds = new Set(assessmentItems.map((i) => i.id));
    setItemCLOs(allItemClo.filter((ic) => itemIds.has(ic.item_id)));
  }

  // โหลดรายชื่อลงทะเบียนของวิชานี้ใหม่ (เรียกหลังเพิ่ม/ลบนักศึกษาสำเร็จ)
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

/**
 * ทำอะไร : แท็บ "นักศึกษาลงทะเบียน" — ตารางรายชื่อที่ลงแล้ว + เพิ่ม/ลบทีละคน + เพิ่ม/ลบทั้งรุ่นในคราว
 *          เดียว (bulk-by-cohort) + BulkEnrollPanel (เลือกหลายคน/อัปโหลดไฟล์) ต่อท้าย
 *
 * เชื่อมกับ : ฟีเจอร์เพิ่ม/ลบทั้งรุ่น (handleBulkByCohort/handleBulkRemoveByCohort) เป็นโค้ดเฉพาะของ
 *             แท็บนี้ ไม่ได้แยกเป็น component ร่วม (ต่างจากการเพิ่มแบบเลือกหลายคน/อัปโหลดไฟล์ที่ใช้
 *             BulkEnrollPanel ร่วมกับ AdminEnrollments.jsx)
 */
function EnrollmentTab({ offeringId, curriculumId, enrollments, studentById, allStudents, onChanged }) {
  // สถานะของฟอร์ม "เพิ่มทีละคน" (ค้นหา + เลือก + error) และ error ของการลบทีละคน
  const [addSearch, setAddSearch] = useState("");
  const [addStudentId, setAddStudentId] = useState("");
  const [addError, setAddError] = useState("");
  const [removeError, setRemoveError] = useState("");

  // สถานะของฟอร์ม "เพิ่มทั้งรุ่น/ชั้นปี"
  const [cohortYear, setCohortYear] = useState("");
  const [cohortSubmitting, setCohortSubmitting] = useState(false);
  const [cohortError, setCohortError] = useState("");
  const [cohortResultMessage, setCohortResultMessage] = useState("");

  // สถานะของฟอร์ม "ลบรายชื่อทั้งรุ่น" (คนละฟอร์มกับด้านบน แยก state ไม่ปนกัน)
  const [removeCohortYear, setRemoveCohortYear] = useState("");
  const [removeCohortSubmitting, setRemoveCohortSubmitting] = useState(false);
  const [removeCohortError, setRemoveCohortError] = useState("");
  const [removeCohortResultMessage, setRemoveCohortResultMessage] = useState("");

  // รายชื่อนักศึกษาที่ลงทะเบียนวิชานี้ไปแล้วในหมู่/section อื่น (วิชาเดียวกัน ภาคเรียนเดียวกัน)
  // ใช้แยกไม่ให้ปนกับคนที่ยังไม่ได้ลงทะเบียนเลย เช่น รุ่น 69 ที่แบ่งเป็น 2 หมู่เพราะคนเยอะ
  const [otherSectionMap, setOtherSectionMap] = useState({});

  // โหลด mapping "ใครลงทะเบียนวิชานี้ไปแล้วที่หมู่อื่น" ใหม่ทุกครั้งที่เปลี่ยน offering
  useEffect(() => {
    let cancelled = false;
    setOtherSectionMap({});
    getSiblingSectionEnrollments(offeringId)
      .then((rows) => {
        if (cancelled) return;
        const map = {};
        rows.forEach((r) => (map[r.student_id] = r.section));
        setOtherSectionMap(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [offeringId]);

  // จับคู่ enrollment แต่ละแถวกับข้อมูลนักศึกษาเต็ม (studentById) เรียงตามรหัส - ตัดทิ้งถ้าหา student
  // ไม่เจอ (ข้อมูลไม่ตรงกันผิดปกติ กันหน้าพังดีกว่าแสดงแถวว่าง)
  const enrolledRoster = useMemo(
    () =>
      enrollments
        .map((e) => ({ enrollment: e, student: studentById[e.student_id] }))
        .filter((r) => r.student)
        .sort((a, b) => a.student.id.localeCompare(b.student.id)),
    [enrollments, studentById]
  );

  const enrolledIds = useMemo(() => new Set(enrollments.map((e) => e.student_id)), [enrollments]);

  // ตัวเลือกในฟอร์ม "เพิ่มทีละคน" - ตัดคนที่ลงทะเบียนแล้วและคนที่ลงหมู่อื่นของวิชานี้แล้วออก แล้วกรอง
  // ด้วยคำค้นหาต่อ (ถ้ามี)
  const availableStudents = useMemo(() => {
    const candidates = allStudents.filter((s) => !enrolledIds.has(s.id) && !otherSectionMap[s.id]);
    if (!addSearch.trim()) return candidates;
    const q = addSearch.trim().toLowerCase();
    return candidates.filter(
      (s) => s.id.toLowerCase().includes(q) || `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
    );
  }, [allStudents, enrolledIds, otherSectionMap, addSearch]);

  // รุ่นที่มีในหลักสูตรของวิชานี้ (ไม่ใช่ทุกรุ่นในระบบ) - ใช้เป็นตัวเลือกของฟอร์ม "เพิ่มทั้งรุ่น"
  const cohortOptions = useMemo(() => {
    const years = new Set(
      allStudents.filter((s) => s.curriculum_id === curriculumId).map((s) => s.cohort_year)
    );
    return Array.from(years).sort((a, b) => a - b);
  }, [allStudents, curriculumId]);

  // นักศึกษารุ่นที่เลือกไว้ (ในหลักสูตรนี้) ที่ยังไม่ได้ลงทะเบียนวิชานี้ - ยังไม่แยกว่าใครอยู่หมู่อื่น
  // แล้วบ้าง (ดู cohortOtherSectionStudents/cohortPreviewCount ด้านล่างที่แยกกลุ่มนี้ออกจากกัน)
  const cohortCandidates = useMemo(() => {
    if (!cohortYear) return [];
    return allStudents.filter(
      (s) =>
        s.curriculum_id === curriculumId &&
        s.cohort_year === Number(cohortYear) &&
        !enrolledIds.has(s.id)
    );
  }, [allStudents, curriculumId, cohortYear, enrolledIds]);

  // ในกลุ่มผู้สมัคร ใครลงทะเบียนวิชานี้ไปแล้วที่หมู่อื่น (จะไม่ถูกเพิ่มซ้ำ - แสดงแยกไว้ให้เห็นชัด)
  const cohortOtherSectionStudents = useMemo(
    () => cohortCandidates.filter((s) => otherSectionMap[s.id]),
    [cohortCandidates, otherSectionMap]
  );

  // จำนวนคนที่ "เพิ่มทั้งรุ่นนี้" จะเพิ่มให้จริง (ตัดคนที่อยู่หมู่อื่นแล้วออก) - ใช้แสดง preview ก่อนกด
  const cohortPreviewCount = useMemo(
    () => cohortCandidates.filter((s) => !otherSectionMap[s.id]).length,
    [cohortCandidates, otherSectionMap]
  );

  // รุ่นที่มีนักศึกษาลงทะเบียนวิชานี้อยู่จริง - ใช้เป็นตัวเลือกสำหรับ "ลบรายชื่อทั้งรุ่น"
  const enrolledCohortOptions = useMemo(() => {
    const years = new Set(
      enrolledRoster.map(({ student }) => student.cohort_year).filter((y) => y != null)
    );
    return Array.from(years).sort((a, b) => a - b);
  }, [enrolledRoster]);

  // นักศึกษารุ่นที่เลือกไว้ ที่ลงทะเบียนวิชานี้อยู่จริง (ตัวเลือกมาจาก enrolledCohortOptions ด้านบน
  // ซึ่ง derive จากคนที่ลงทะเบียนแล้วเท่านั้น จึงการันตีว่ามีคนให้ลบเสมอถ้าเลือกรุ่นนั้น)
  const removeCohortCandidates = useMemo(() => {
    if (!removeCohortYear) return [];
    return enrolledRoster.filter(({ student }) => student.cohort_year === Number(removeCohortYear));
  }, [enrolledRoster, removeCohortYear]);

  // เพิ่มนักศึกษารุ่นที่เลือกทั้งรุ่นเข้าวิชานี้ในครั้งเดียว - ยืนยันด้วย window.confirm ก่อนเสมอ
  // (กระทบคนจำนวนมากในครั้งเดียว)
  async function handleBulkByCohort() {
    if (!cohortYear) return;
    if (
      !window.confirm(
        `ยืนยันเพิ่มนักศึกษารุ่น ${cohortYear} ทั้งหมด ${cohortPreviewCount} คน เข้าวิชานี้?`
      )
    )
      return;
    setCohortSubmitting(true);
    setCohortError("");
    setCohortResultMessage("");
    try {
      const result = await bulkEnrollByCohort(offeringId, Number(cohortYear));
      setCohortResultMessage(
        `เพิ่มสำเร็จ ${result.added_count} คน${
          result.already_enrolled_count > 0 ? ` (ข้าม ${result.already_enrolled_count} คนที่ลงทะเบียนแล้ว)` : ""
        }${
          result.already_in_other_section.length > 0
            ? ` (ข้าม ${result.already_in_other_section.length} คนที่อยู่หมู่อื่นของวิชานี้แล้ว)`
            : ""
        }`
      );
      await onChanged();
    } catch (err) {
      setCohortError(err?.response?.data?.detail || "เพิ่มนักศึกษารุ่นนี้ไม่สำเร็จ");
    } finally {
      setCohortSubmitting(false);
    }
  }

  // ถอนนักศึกษารุ่นที่เลือกทั้งรุ่นออกจากวิชานี้ในครั้งเดียว (ตรงข้ามกับ handleBulkByCohort ด้านบน) -
  // ยืนยันก่อนเสมอ เพราะย้อนกลับไม่ได้
  async function handleBulkRemoveByCohort() {
    if (!removeCohortYear) return;
    if (
      !window.confirm(
        `ยืนยันลบนักศึกษารุ่น ${removeCohortYear} ทั้งหมด ${removeCohortCandidates.length} คน ออกจากวิชานี้? การกระทำนี้ย้อนกลับไม่ได้`
      )
    )
      return;
    setRemoveCohortSubmitting(true);
    setRemoveCohortError("");
    setRemoveCohortResultMessage("");
    try {
      const result = await bulkRemoveByCohort(offeringId, Number(removeCohortYear));
      setRemoveCohortResultMessage(`ลบสำเร็จ ${result.removed_count} คน`);
      setRemoveCohortYear("");
      await onChanged();
    } catch (err) {
      setRemoveCohortError(err?.response?.data?.detail || "ลบนักศึกษารุ่นนี้ไม่สำเร็จ");
    } finally {
      setRemoveCohortSubmitting(false);
    }
  }

  // ลงทะเบียนนักศึกษา 1 คนที่เลือกในฟอร์ม "เพิ่มทีละคน"
  async function handleAddStudent(e) {
    e.preventDefault();
    setAddError("");
    if (!addStudentId) return;
    try {
      await createEnrollment({ student_id: addStudentId, offering_id: offeringId });
      setAddStudentId("");
      setAddSearch("");
      await onChanged();
    } catch (err) {
      setAddError(err?.response?.data?.detail || "เพิ่มนักศึกษาไม่สำเร็จ");
    }
  }

  // ถอนนักศึกษา 1 คนออกจากการลงทะเบียนวิชานี้ (ปุ่มถังขยะในตารางรายชื่อ) - ยืนยันก่อนเสมอ
  async function handleRemove(enrollment, student) {
    if (
      !window.confirm(
        `ยืนยันการลบ ${student.first_name} ${student.last_name} ออกจากการลงทะเบียนวิชานี้?`
      )
    )
      return;
    setRemoveError("");
    try {
      await deleteEnrollment(enrollment.id);
      await onChanged();
    } catch (err) {
      setRemoveError(err?.response?.data?.detail || "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
    <div className="workspace-section">
      <h2>นักศึกษาลงทะเบียน</h2>
      {removeError && <p className="error-message">{removeError}</p>}

      <table className="student-table">
        <thead>
          <tr>
            <th>รหัสนักศึกษา</th>
            <th>ชื่อ-นามสกุล</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {enrolledRoster.map(({ enrollment, student }) => (
            <tr key={enrollment.id} className="student-table-row">
              <td className="student-table-cell">{student.id}</td>
              <td className="student-table-cell">
                {student.first_name} {student.last_name}
              </td>
              <td className="student-table-cell">
                <button
                  type="button"
                  className="icon-btn-delete"
                  title="ลบ"
                  onClick={() => handleRemove(enrollment, student)}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {enrolledRoster.length === 0 && (
        <p className="student-list-empty">วิชานี้ยังไม่มีนักศึกษาลงทะเบียน</p>
      )}

      <form onSubmit={handleAddStudent} className="workspace-inline-form">
        <div className="form-field">
          <label htmlFor="enroll-search">ค้นหานักศึกษาที่ยังไม่ได้ลงทะเบียน</label>
          <div className="toolbar-search">
            <Search size={16} />
            <input
              id="enroll-search"
              type="text"
              placeholder="ค้นหารหัส/ชื่อนักศึกษา..."
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="enroll-select">เลือกนักศึกษา</label>
          <select
            id="enroll-select"
            value={addStudentId}
            onChange={(e) => setAddStudentId(e.target.value)}
            required
          >
            <option value="" disabled>
              เลือกนักศึกษา
            </option>
            {availableStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">+ เพิ่มเข้าวิชานี้</button>
      </form>
      {addError && <p className="error-message">{addError}</p>}
      {availableStudents.length === 0 && addSearch === "" && (
        <p className="student-list-empty">นักศึกษาทุกคนลงทะเบียนวิชานี้แล้ว</p>
      )}
      </div>

      <div className="workspace-section">
        <h2>
          <Users size={18} strokeWidth={2} /> เพิ่มทั้งรุ่น/ชั้นปี
        </h2>
        {cohortError && <p className="error-message">{cohortError}</p>}
        <div className="workspace-inline-form">
          <div className="form-field">
            <label htmlFor="cohort-select">เลือกรุ่น (cohort_year)</label>
            <select
              id="cohort-select"
              value={cohortYear}
              onChange={(e) => {
                setCohortYear(e.target.value);
                setCohortResultMessage("");
              }}
            >
              <option value="">-- เลือกรุ่น --</option>
              {cohortOptions.map((y) => (
                <option key={y} value={y}>
                  รุ่น {y}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleBulkByCohort}
            disabled={!cohortYear || cohortSubmitting}
          >
            {cohortSubmitting ? "กำลังเพิ่ม..." : "เพิ่มนักศึกษารุ่นนี้ทั้งหมด"}
          </button>
        </div>
        {cohortYear && (
          <p className="workspace-hint-inline">
            จะเพิ่มนักศึกษา {cohortPreviewCount} คน (รุ่น {cohortYear} ที่ยังไม่ได้ลงทะเบียนวิชานี้)
          </p>
        )}
        {cohortYear && cohortOtherSectionStudents.length > 0 && (
          <div className="enroll-other-section-note">
            <p className="workspace-hint-inline">
              อีก {cohortOtherSectionStudents.length} คนของรุ่น {cohortYear} ลงทะเบียนวิชานี้ไปแล้วที่หมู่อื่น
              (จะไม่ถูกเพิ่มซ้ำ):
            </p>
            <ul className="enroll-other-section-list">
              {cohortOtherSectionStudents.map((s) => (
                <li key={s.id}>
                  {s.id} {s.first_name} {s.last_name} — หมู่ {otherSectionMap[s.id]}
                </li>
              ))}
            </ul>
          </div>
        )}
        {cohortResultMessage && <p className="success-message">{cohortResultMessage}</p>}
      </div>

      <div className="workspace-section">
        <h2>
          <Users size={18} strokeWidth={2} /> ลบรายชื่อทั้งรุ่น
        </h2>
        {removeCohortError && <p className="error-message">{removeCohortError}</p>}
        <div className="workspace-inline-form">
          <div className="form-field">
            <label htmlFor="remove-cohort-select">เลือกรุ่น (cohort_year)</label>
            <select
              id="remove-cohort-select"
              value={removeCohortYear}
              onChange={(e) => {
                setRemoveCohortYear(e.target.value);
                setRemoveCohortResultMessage("");
              }}
            >
              <option value="">-- เลือกรุ่น --</option>
              {enrolledCohortOptions.map((y) => (
                <option key={y} value={y}>
                  รุ่น {y}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleBulkRemoveByCohort}
            disabled={!removeCohortYear || removeCohortSubmitting}
          >
            {removeCohortSubmitting ? "กำลังลบ..." : "ลบนักศึกษารุ่นนี้ทั้งหมด"}
          </button>
        </div>
        {removeCohortYear && (
          <p className="workspace-hint-inline">
            จะลบนักศึกษา {removeCohortCandidates.length} คน (รุ่น {removeCohortYear} ที่ลงทะเบียนวิชานี้อยู่)
            ออกจากการลงทะเบียนวิชานี้
          </p>
        )}
        {removeCohortResultMessage && <p className="success-message">{removeCohortResultMessage}</p>}
      </div>

      <BulkEnrollPanel
        offeringId={offeringId}
        allStudents={allStudents}
        onChanged={onChanged}
        showMultiSelect={false}
      />
    </>
  );
}

/**
 * ทำอะไร : แท็บ "โครงสร้างการประเมิน" — 3 ส่วนเรียงกันตามลำดับงานจริง: (1) สร้าง CLO ของวิชา (หลาย
 *          แถวพร้อมกันได้ในฟอร์มเดียว) (2) สร้างงานประเมิน (ควิซ/สอบ/การบ้าน ฯลฯ) (3) ผูกงานประเมิน
 *          แต่ละชิ้นเข้ากับ CLO พร้อมกำหนดน้ำหนัก (%)
 *
 * เชื่อมกับ : ไม่มีการผูก PLO ในหน้านี้อีกต่อไป (ย้ายไปทำที่ระดับวิชาผ่านหน้า "เชื่อมโยงรายวิชากับ PLO"
 *             แยกต่างหาก) - โค้ดส่วนนี้เป็นโค้ดเฉพาะของ workspace ไฟล์นี้ ไม่ได้แยกเป็น component ร่วม
 *             กับหน้าไหน เพราะไม่มีหน้าอื่นต้องการ workflow สร้าง CLO หลายแถว + ผูกน้ำหนักในหน้าเดียว
 *
 * ถ้าแก้ : น้ำหนักรวมต่อ CLO ต้องไม่เกิน 100% - เช็คทั้งฝั่งนี้ (ก่อนยิง API เพื่อ UX ที่เร็วกว่า) และ
 *          ฝั่ง backend (item_clo.py) ซ้ำอีกชั้น (แหล่งความจริงที่แท้จริง)
 */
function StructureTab({
  offeringId,
  courseId,
  curriculumId,
  assessmentItems,
  courseCLOs,
  itemCLOs,
  onStructureChanged,
  onItemCLOChanged,
  onCLOChanged,
}) {
  // สถานะของฟอร์ม "เพิ่มงานประเมิน"
  const [name, setName] = useState("");
  const [type, setType] = useState(ASSESSMENT_TYPE_OPTIONS[0]);
  const [totalScore, setTotalScore] = useState("");
  const [itemError, setItemError] = useState("");

  // สถานะของฟอร์ม "ผูกงานประเมินกับ CLO"
  const [mapItemId, setMapItemId] = useState("");
  const [mapCloId, setMapCloId] = useState("");
  const [mapWeight, setMapWeight] = useState("");
  const [mapError, setMapError] = useState("");

  // --- สร้าง CLO หลายแถวพร้อมกัน (batch) - ไม่มีการผูก PLO ต่อ CLO ในหน้านี้อีกต่อไป (ผูกที่ระดับวิชา
  // แยกต่างหากผ่านหน้า "เชื่อมโยงรายวิชากับ PLO") - code เป็น "CLO{n}" auto-generate จากตำแหน่งแถว ไม่
  // ให้พิมพ์เอง - n เริ่มต่อจากเลข CLO สูงสุดที่มีอยู่แล้วจริงในวิชานี้ (ไม่ใช่แค่ courseCLOs.length+1
  // เพราะถ้าเคยลบ CLO กลางๆ ทิ้งไป นับจำนวนเฉยๆ จะชน code เดิมที่ยังอยู่ได้ - ดู existingCloNumberMax
  // ด้านล่าง)
  const cloRowIdRef = useRef(1); // 0 ถูกใช้โดยแถวเริ่มต้นด้านล่างไปแล้ว
  const [cloRows, setCloRows] = useState([{ rowId: 0, description: "", threshold: "", error: "" }]);
  const [savingCloRows, setSavingCloRows] = useState(false);
  const [cloFormError, setCloFormError] = useState("");

  // แปลง assessmentItems/courseCLOs array เป็น map (id -> object) เพื่อ lookup เร็วตอนแสดงตาราง mapping
  const itemById = useMemo(() => {
    const map = {};
    assessmentItems.forEach((i) => (map[i.id] = i));
    return map;
  }, [assessmentItems]);

  const cloById = useMemo(() => {
    const map = {};
    courseCLOs.forEach((c) => (map[c.id] = c));
    return map;
  }, [courseCLOs]);

  // น้ำหนักรวมที่ผูกกับแต่ละ CLO ไปแล้ว (จากงานประเมินทุกชิ้น) - ใช้เตือน/กันไม่ให้ผูกรวมเกิน 100%
  const cloWeightTotals = useMemo(() => {
    const totals = {};
    itemCLOs.forEach((ic) => {
      totals[ic.clo_id] = (totals[ic.clo_id] || 0) + Number(ic.weight_percent);
    });
    return totals;
  }, [itemCLOs]);

  // น้ำหนักที่ผูกไปแล้วของ CLO ที่กำลังเลือกอยู่ในฟอร์ม mapping + เพดานที่ยังผูกเพิ่มได้ (ใช้ทั้งเป็น
  // max ของช่อง input และแสดง hint ใต้ฟอร์ม)
  const mapCloCurrentTotal = mapCloId ? cloWeightTotals[Number(mapCloId)] || 0 : 0;
  const mapCloRemainingWeight = Math.max(0, 100 - mapCloCurrentTotal);

  // เลข CLO สูงสุดที่มีอยู่จริงแล้วในวิชานี้ (จาก code ที่ตรงรูปแบบ "CLO<เลข>" เท่านั้น ไม่สนตัวพิมพ์เล็ก
  // ใหญ่ - code เก่าที่ตั้งชื่อไม่ตรงรูปแบบนี้เลยจะไม่ถูกนับ แต่ก็ไม่ชนกันเองอยู่แล้วเพราะ code ใหม่ที่สร้าง
  // จะเป็น "CLO{n}" เป๊ะทุกครั้ง) แถวใหม่แต่ละแถวได้เลขต่อจากนี้ +1, +2, ... ตามตำแหน่งในฟอร์ม
  const existingCloNumberMax = useMemo(() => {
    let max = 0;
    courseCLOs.forEach((c) => {
      const match = /^CLO(\d+)$/i.exec(c.code ?? "");
      if (match) max = Math.max(max, Number(match[1]));
    });
    return max;
  }, [courseCLOs]);

  // เพิ่มแถวฟอร์ม CLO ใหม่อีก 1 แถว (rowId เป็นแค่ key ของ React ไม่ใช่รหัส CLO จริง - รหัส CLO จริง
  // คำนวณตอนบันทึกจาก existingCloNumberMax + ตำแหน่งแถว)
  function addCloRow() {
    const rowId = cloRowIdRef.current++;
    setCloRows((prev) => [...prev, { rowId, description: "", threshold: "", error: "" }]);
  }

  function removeCloRow(rowId) {
    setCloRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  // อัปเดตค่าฟอร์มของแถวหนึ่ง (ล้าง error เดิมของแถวนั้นทิ้งเพราะกำลังแก้ใหม่)
  function updateCloRow(rowId, field, value) {
    setCloRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value, error: "" } : r))
    );
  }

  // เกณฑ์ผ่านต้องเป็นจำนวนเต็ม 0-100 เท่านั้น
  function isValidThresholdInput(value) {
    if (value === "" || value === null || value === undefined) return false;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 && n <= 100;
  }

  async function handleSaveCloRows(e) {
    e.preventDefault();
    if (cloRows.length === 0 || savingCloRows) return;

    // validate ทุกแถวก่อนยิง request ใดๆ เลย - ถ้ามีแถวไหนไม่ผ่าน แสดง error ที่แถวนั้นแล้วหยุด ไม่ต้อง
    // สร้างแถวที่ผ่านไปก่อนบางส่วน (กันสร้างครึ่งๆ กลางๆ จากข้อมูลที่ยังกรอกไม่ครบ)
    let hasInvalid = false;
    const validatedRows = cloRows.map((row) => {
      let error = "";
      if (!row.description.trim()) {
        error = "กรุณากรอกคำอธิบาย";
      } else if (!isValidThresholdInput(row.threshold)) {
        error = "เกณฑ์ผ่านต้องเป็นจำนวนเต็ม 0-100 (ไม่มีทศนิยม)";
      }
      if (error) hasInvalid = true;
      return { ...row, error };
    });
    if (hasInvalid) {
      setCloRows(validatedRows);
      return;
    }

    setSavingCloRows(true);
    const results = await Promise.allSettled(
      validatedRows.map((row, index) =>
        createCLO({
          course_id: courseId,
          code: `CLO${existingCloNumberMax + index + 1}`,
          description: row.description.trim(),
          pass_threshold_percent: Number(row.threshold),
        })
      )
    );
    setSavingCloRows(false);

    const anyFailed = results.some((r) => r.status === "rejected");
    if (anyFailed) {
      // เหลือไว้เฉพาะแถวที่พลาด (แถวที่สำเร็จแล้วขึ้นในตารางด้านล่างไปแล้วจาก onCLOChanged() - ถ้าปล่อย
      // ให้ยังค้างอยู่ในฟอร์มด้วย กด "บันทึก" ซ้ำจะพยายามสร้างซ้ำด้วย code เดิมที่มีอยู่แล้ว ชนแน่นอน)
      // ไม่ล้างค่า description/threshold ของแถวที่พลาดทิ้ง ให้แก้แล้วกดบันทึกใหม่ได้เลยไม่ต้องพิมพ์ซ้ำ
      await onCLOChanged();
      setCloRows(
        validatedRows
          .map((row, index) => {
            const result = results[index];
            return result.status === "rejected"
              ? {
                  ...row,
                  error:
                    result.reason?.response?.data?.detail ||
                    "สร้าง CLO นี้ไม่สำเร็จ (รหัส CLO นี้อาจมีอยู่แล้วในวิชานี้)",
                }
              : null;
          })
          .filter(Boolean)
      );
      return;
    }

    await onCLOChanged();
    setCloRows([{ rowId: cloRowIdRef.current++, description: "", threshold: "", error: "" }]);
  }

  // ลบ CLO - เตือนชัดเจนว่าจะลบ mapping (item_clo) ที่ผูกอยู่ไปด้วย (cascade ฝั่ง backend)
  async function handleDeleteCLO(id) {
    if (
      !window.confirm("ยืนยันการลบ CLO นี้? การลบจะลบการผูกกับงานประเมินที่มีอยู่ทั้งหมดของ CLO นี้ไปด้วย")
    )
      return;
    try {
      await deleteCLO(id);
      await onCLOChanged();
    } catch (err) {
      setCloFormError(err?.response?.data?.detail || "ลบ CLO ไม่สำเร็จ");
    }
  }

  // สร้างงานประเมินใหม่ - คะแนนเต็มต้องเป็นจำนวนเต็มมากกว่า 0
  async function handleAddItem(e) {
    e.preventDefault();
    setItemError("");
    if (!name.trim() || totalScore === "") return;
    const parsedTotal = Number(totalScore);
    if (!Number.isInteger(parsedTotal) || parsedTotal <= 0) {
      setItemError('"คะแนนเต็ม" ต้องเป็นจำนวนเต็มมากกว่า 0');
      return;
    }
    try {
      await createAssessmentItem({
        offering_id: offeringId,
        name: name.trim(),
        type,
        total_score: parsedTotal,
      });
      setName("");
      setTotalScore("");
      await onStructureChanged();
    } catch (err) {
      setItemError(err?.response?.data?.detail || "เพิ่มงานประเมินไม่สำเร็จ");
    }
  }

  // ลบงานประเมิน - cascade ลบ mapping (item_clo) และคะแนนที่บันทึกไว้ของชิ้นงานนี้ไปด้วยฝั่ง backend
  async function handleDeleteItem(id) {
    if (!window.confirm("ยืนยันการลบงานประเมินนี้? การกระทำนี้ย้อนกลับไม่ได้")) return;
    try {
      await deleteAssessmentItem(id);
      await onStructureChanged();
    } catch {
      setItemError("ลบไม่สำเร็จ");
    }
  }

  // ผูกงานประเมินเข้ากับ CLO พร้อมน้ำหนัก - เช็คน้ำหนักรวมของ CLO นี้ไม่เกิน 100% ก่อนยิง API เสมอ (ให้
  // feedback เร็วกว่ารอ backend ตอบ 400 กลับมา - backend ก็เช็คซ้ำอีกชั้นเป็นแหล่งความจริงที่แท้จริง)
  async function handleAddMapping(e) {
    e.preventDefault();
    setMapError("");
    if (!mapItemId || !mapCloId || mapWeight === "") return;
    const parsedWeight = Number(mapWeight);
    if (!Number.isInteger(parsedWeight) || parsedWeight < 0 || parsedWeight > 100) {
      setMapError('"น้ำหนัก (%)" ต้องเป็นจำนวนเต็ม 0-100 (ไม่มีทศนิยม)');
      return;
    }
    const newTotal = mapCloCurrentTotal + parsedWeight;
    if (newTotal > 100) {
      setMapError(
        `น้ำหนักรวมของ ${cloById[Number(mapCloId)]?.code ?? "CLO นี้"} จะเกิน 100% ` +
          `(มีอยู่แล้ว ${mapCloCurrentTotal}% + ที่จะเพิ่ม ${parsedWeight}% = ${newTotal}%) ` +
          `ผูกได้อีกไม่เกิน ${mapCloRemainingWeight}%`
      );
      return;
    }
    try {
      await createItemCLO({
        item_id: Number(mapItemId),
        clo_id: Number(mapCloId),
        weight_percent: parsedWeight,
      });
      setMapItemId("");
      setMapCloId("");
      setMapWeight("");
      await onItemCLOChanged();
    } catch (err) {
      setMapError(err?.response?.data?.detail || "เพิ่ม mapping ไม่สำเร็จ (อาจมี mapping นี้อยู่แล้ว)");
    }
  }

  // ลบ mapping (ปลดชิ้นงานนี้ออกจาก CLO นี้ - ไม่กระทบตัวชิ้นงาน/CLO เอง)
  async function handleDeleteMapping(id) {
    if (!window.confirm("ยืนยันการลบ mapping นี้?")) return;
    try {
      await deleteItemCLO(id);
      await onItemCLOChanged();
    } catch {
      setMapError("ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <div className="workspace-section">
        <h2>CLO ของวิชานี้ (Course Learning Outcome)</h2>
        <p className="workspace-hint-inline">
          สร้าง CLO ของวิชาก่อน (จะมีกี่ข้อก็ได้) กำหนดเกณฑ์ผ่าน (%) ต่อข้อ จากนั้นค่อยไปสร้างงานประเมิน
          ผูกกับ CLO ในหัวข้อถัดไป (การเชื่อมโยงกับ PLO ทำที่ระดับวิชาผ่านหน้า "เชื่อมโยงรายวิชากับ PLO"
          แยกต่างหาก ไม่ใช่ตรงนี้)
        </p>
        {cloFormError && <p className="error-message">{cloFormError}</p>}

        <table className="student-table">
          <thead>
            <tr>
              <th>รหัส CLO</th>
              <th>คำอธิบาย</th>
              <th>เกณฑ์ผ่าน (%)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courseCLOs.map((clo) => (
              <tr key={clo.id} className="student-table-row">
                <td className="student-table-cell">{clo.code}</td>
                <td className="student-table-cell">{clo.description}</td>
                <td className="student-table-cell">{clo.pass_threshold_percent}</td>
                <td className="student-table-cell">
                  <button
                    type="button"
                    className="icon-btn-delete"
                    title="ลบ CLO"
                    onClick={() => handleDeleteCLO(clo.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {courseCLOs.length === 0 && (
          <p className="student-list-empty">วิชานี้ยังไม่มี CLO - สร้างข้อแรกด้านล่างได้เลย</p>
        )}

        <form onSubmit={handleSaveCloRows} className="clo-multi-row-form">
          {cloRows.map((row, index) => {
            const cloNumber = existingCloNumberMax + index + 1;
            return (
              <div key={row.rowId} className="clo-multi-row-wrapper">
                <div className="workspace-inline-form clo-multi-row">
                  <span className="clo-multi-row-label">CLO{cloNumber}</span>
                  <div className="form-field">
                    <label htmlFor={`clo-row-desc-${row.rowId}`}>คำอธิบาย</label>
                    <input
                      id={`clo-row-desc-${row.rowId}`}
                      type="text"
                      value={row.description}
                      onChange={(e) => updateCloRow(row.rowId, "description", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`clo-row-threshold-${row.rowId}`}>เกณฑ์ผ่าน (%)</label>
                    <input
                      id={`clo-row-threshold-${row.rowId}`}
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={row.threshold}
                      onChange={(e) => updateCloRow(row.rowId, "threshold", e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="icon-btn-delete"
                    title="ลบแถวนี้"
                    onClick={() => removeCloRow(row.rowId)}
                  >
                    ×
                  </button>
                </div>
                {row.error && <p className="error-message clo-multi-row-error">{row.error}</p>}
              </div>
            );
          })}

          <div className="workspace-inline-form">
            <button type="button" onClick={addCloRow}>
              + เพิ่ม CLO
            </button>
            <button type="submit" disabled={cloRows.length === 0 || savingCloRows}>
              {savingCloRows ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>

      <div className="workspace-section">
        <h2>งานประเมิน (Assessment Item)</h2>
        {itemError && <p className="error-message">{itemError}</p>}
        <table className="student-table">
          <thead>
            <tr>
              <th>ชื่องาน</th>
              <th>ประเภท</th>
              <th>คะแนนเต็ม</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assessmentItems.map((item) => (
              <tr key={item.id} className="student-table-row">
                <td className="student-table-cell">{item.name}</td>
                <td className="student-table-cell">{item.type}</td>
                <td className="student-table-cell">{item.total_score}</td>
                <td className="student-table-cell">
                  <button
                    type="button"
                    className="icon-btn-delete"
                    title="ลบ"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {assessmentItems.length === 0 && (
          <p className="student-list-empty">วิชานี้ยังไม่มีงานประเมิน</p>
        )}

        <form onSubmit={handleAddItem} className="workspace-inline-form">
          <div className="form-field">
            <label htmlFor="new-item-name">ชื่องาน</label>
            <input
              id="new-item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="new-item-type">ประเภท</label>
            <select id="new-item-type" value={type} onChange={(e) => setType(e.target.value)}>
              {ASSESSMENT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {ASSESSMENT_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="new-item-total">คะแนนเต็ม</label>
            <input
              id="new-item-total"
              type="number"
              step="1"
              min="1"
              value={totalScore}
              onChange={(e) => setTotalScore(e.target.value)}
              required
            />
          </div>
          <button type="submit">+ เพิ่มงานประเมิน</button>
        </form>
      </div>

      <div className="workspace-section">
        <h2>ผูกงานประเมินกับ CLO</h2>
        {mapError && <p className="error-message">{mapError}</p>}
        <table className="student-table">
          <thead>
            <tr>
              <th>ชื่องาน</th>
              <th>CLO</th>
              <th title="น้ำหนักคะแนนของชิ้นงานนี้ต่อ CLO นี้ - รวมทุกชิ้นงานที่ผูกกับ CLO เดียวกันควรเท่ากับ 100%">
                น้ำหนัก (%)
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itemCLOs.map((ic) => (
              <tr key={ic.id} className="student-table-row">
                <td className="student-table-cell">{itemById[ic.item_id]?.name ?? ic.item_id}</td>
                <td className="student-table-cell">{cloById[ic.clo_id]?.code ?? ic.clo_id}</td>
                <td className="student-table-cell">{ic.weight_percent}</td>
                <td className="student-table-cell">
                  <button
                    type="button"
                    className="icon-btn-delete"
                    title="ลบ"
                    onClick={() => handleDeleteMapping(ic.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {itemCLOs.length === 0 && (
          <p className="student-list-empty">วิชานี้ยังไม่มีการผูกงานประเมินกับ CLO</p>
        )}
        {courseCLOs.length === 0 && (
          <p className="workspace-hint-inline">
            วิชานี้ยังไม่มี CLO เลย - สร้าง CLO ในหัวข้อ "CLO ของวิชานี้" ด้านบนก่อน ถึงจะเลือกผูกที่นี่ได้
          </p>
        )}

        <form onSubmit={handleAddMapping} className="workspace-inline-form">
          <div className="form-field">
            <label htmlFor="map-item">งานประเมิน</label>
            <select
              id="map-item"
              value={mapItemId}
              onChange={(e) => setMapItemId(e.target.value)}
              required
            >
              <option value="" disabled>
                เลือกงานประเมิน
              </option>
              {assessmentItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="map-clo">CLO</label>
            <select
              id="map-clo"
              value={mapCloId}
              onChange={(e) => setMapCloId(e.target.value)}
              required
            >
              <option value="" disabled>
                เลือก CLO
              </option>
              {courseCLOs.map((clo) => (
                <option key={clo.id} value={clo.id}>
                  {clo.code}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="map-weight">น้ำหนัก (%)</label>
            <input
              id="map-weight"
              type="number"
              step="1"
              min="0"
              max={mapCloId ? mapCloRemainingWeight : undefined}
              value={mapWeight}
              onChange={(e) => setMapWeight(e.target.value)}
              required
            />
          </div>
          <button type="submit">+ เพิ่ม mapping</button>
        </form>
        {mapCloId && (
          <p className="workspace-hint-inline">
            {cloById[Number(mapCloId)]?.code ?? "CLO นี้"} ผูกน้ำหนักไปแล้ว {mapCloCurrentTotal}%
            (ผูกเพิ่มได้อีกไม่เกิน {mapCloRemainingWeight}%)
          </p>
        )}
      </div>
    </>
  );
}

