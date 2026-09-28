/**
 * ทำอะไร : พื้นที่ทำงานหลักของอาจารย์ต่อวิชาที่เปิดสอนหนึ่งวิชา (route /course-workspace) — เลือกวิชา
 *          จาก dropdown แล้วสลับ 6 แท็บ: ข้อมูลรายวิชา (PLO ที่วิชาเชื่อมอยู่) / นักศึกษาลงทะเบียน / CLO /
 *          โครงสร้างการประเมิน (งานประเมิน +
 *          ผูกน้ำหนักกับ CLO) / กรอกคะแนน / ผลบรรลุ CLO เป็นไฟล์ที่ใหญ่ที่สุดของโปรเจกต์ เพราะรวมทุกงาน
 *          ประจำภาคเรียนของอาจารย์ไว้หน้าเดียว (ไม่ต้องสลับหน้าไปมาระหว่างทำงาน)
 *
 * เชื่อมกับ : แท็บ "กรอกคะแนน" และ "ผลบรรลุ CLO" ใช้ ScoresPanel/CLOAchievementPanel component ที่ถูก
 *             แยกออกมาให้ AdminCourseGrading.jsx (เวอร์ชันสำหรับ admin) ใช้ร่วมด้วย ส่วนแท็บ
 *             "นักศึกษาลงทะเบียน" ใช้ BulkEnrollPanel ร่วมกับ AdminEnrollments.jsx เช่นกัน — เหลือแค่
 *             แท็บ "โครงสร้างการประเมิน" (StructureTab ด้านล่าง) ที่ยังเป็นโค้ดเฉพาะของไฟล์นี้ เพราะไม่
 *             มีหน้าอื่นต้องการ workflow แบบเดียวกัน (สร้างงานประเมิน + ผูกน้ำหนักกับ CLO ในหน้าเดียว)
 *
 *             แท็บ "CLO" (CLOManageTab ด้านล่าง, 2026-09-28) - อาจารย์เจ้าของวิชาจัดการ CLO ของวิชาตัวเอง
 *             ได้แล้ว (สร้าง/แก้/ลบ + ผูก/แก้น้ำหนัก/ถอด PLO) ย้อนกลับจากเดิมที่ให้แอดมินทำทุกอย่าง
 *             (AdminCourse.jsx/AdminCLO.jsx ยังใช้งานได้เหมือนเดิมสำหรับแอดมิน) สิทธิ์เช็คฝั่ง backend
 *             ล้วนๆ (ownership check ที่มีอยู่แล้วใน POST/PUT/DELETE /clo และ /clo-plo-mapping - ไม่ต้อง
 *             เพิ่มเช็คฝั่ง frontend) ใช้ CLODomainField (export จาก AdminCLO.jsx) และข้อความกล่องยืนยัน
 *             ประเภทไม่ตรงกัน (buildDomainMismatchMessage ใน utils/cloDomain.js) แบบเดียวกับหน้าแอดมิน -
 *             StructureTab ด้านล่างยังแสดง CLO แบบอ่านอย่างเดียวเหมือนเดิม (อ้างอิงตอนผูกงานประเมิน)
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
  Upload,
  CheckCircle2,
  Flag,
  Info,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import BulkEnrollPanel from "../../components/BulkEnrollPanel.jsx";
import ScoresPanel from "../../components/ScoresPanel.jsx";
import CLOAchievementPanel from "../../components/CLOAchievementPanel.jsx";
import { ResultPanel as RosterResultPanel } from "./AdminRosterImport.jsx";
import { CLODomainField } from "./AdminCLO.jsx";
import { CLO_DOMAIN_LABEL_TH, buildDomainMismatchMessage } from "../../utils/cloDomain.js";
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
  updateCLO,
  deleteCLO,
  listPLO,
  listCLOPLOMapping,
  createCLOPLOMapping,
  updateCLOPLOMapping,
  deleteCLOPLOMapping,
  checkCLOPLODomainMatch,
  listEnrollments,
  createEnrollment,
  deleteEnrollment,
  bulkEnrollByCohort,
  bulkRemoveByCohort,
  getSiblingSectionEnrollments,
  listStudents,
  importRosterToOffering,
} from "../../api/client.js";

const ASSESSMENT_TYPE_OPTIONS = ["quiz", "midterm", "final", "assignment", "project"];
const ASSESSMENT_TYPE_LABELS = {
  quiz: "แบบทดสอบย่อย (Quiz)",
  midterm: "สอบกลางภาค (Midterm)",
  final: "สอบปลายภาค (Final)",
  assignment: "งานที่มอบหมาย (Assignment)",
  project: "โปรเจกต์ (Project)",
};

// นิยามแท็บทั้งหมดในที่เดียว - ใช้ทั้งวาดปุ่มแท็บและ empty-state (รายการ "จะมี N แท็บให้ใช้งาน")
const TABS = [
  {
    key: "course-info",
    label: "ข้อมูลรายวิชา",
    icon: Info,
    description: "ดูข้อมูลวิชา และ PLO ที่วิชานี้เชื่อมอยู่ (ผ่าน CLO) พร้อมประเภทของแต่ละ PLO",
  },
  {
    key: "enrollment",
    label: "นักศึกษาลงทะเบียน",
    icon: UserPlus,
    description: "ดู/เพิ่ม/ลบนักศึกษาที่ลงทะเบียนเรียนวิชานี้",
  },
  {
    key: "clo-manage",
    label: "CLO",
    icon: Flag,
    description: "สร้าง/แก้ไข/ลบ CLO ของวิชานี้ และผูก/แก้น้ำหนัก/ถอด PLO",
  },
  {
    key: "structure",
    label: "โครงสร้างการประเมิน",
    icon: ListChecks,
    description: "สร้างงานประเมิน (เช่น สอบกลางภาค, ควิซ) แล้วผูกน้ำหนักกับ CLO ของวิชา (สร้าง CLO ก่อนได้ที่แท็บ \"CLO\")",
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
  const [activeTab, setActiveTab] = useState("course-info");

  // ข้อมูลเฉพาะของวิชาที่เลือกอยู่ในขณะนี้ - โหลดใหม่ทุกครั้งที่เปลี่ยนวิชา (ดู loadWorkspace)
  const [assessmentItems, setAssessmentItems] = useState([]);
  const [allCLOs, setAllCLOs] = useState([]);
  const [itemCLOs, setItemCLOs] = useState([]);
  // เหมือน itemCLOs แต่กรองด้วย clo_id ของ CLO ทั้งหมดของ "วิชา" นี้ (ไม่ใช่แค่ offering/section ที่เลือก
  // อยู่ - CLO ใช้ร่วมกันทุก section) ใช้เช็คว่า CLO ไหน "ถูกใช้แล้ว" (ผูกงานประเมิน) บ้างสำหรับปิดปุ่มลบ
  // ในแท็บ "CLO" - backend เช็คแบบเดียวกันนี้อีกชั้นตอน DELETE /clo จริง (ดู CLOManageTab)
  const [itemCLOsForCourse, setItemCLOsForCourse] = useState([]);
  const [cloPloMappingsForCourse, setCloPloMappingsForCourse] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  // รายชื่อนักศึกษาทั้งระบบ (ไม่ใช่แค่ของวิชานี้) - โหลดครั้งเดียวตอนเปิดหน้า ใช้ทั้งประกอบชื่อคนที่
  // ลงทะเบียนแล้วและเป็นตัวเลือกตอนเพิ่มคนใหม่ (ดู EnrollmentTab)
  const [allStudents, setAllStudents] = useState([]);
  // PLO ทั้งระบบ - โหลดครั้งเดียวตอนเปิดหน้า ใช้กรองเหลือเฉพาะของหลักสูตรวิชานี้ในแท็บ "CLO" (ดู
  // CLOManageTab)
  const [allPLOs, setAllPLOs] = useState([]);

  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  // โหลดรายการวิชาที่เปิดสอน + รายวิชาทั้งระบบ + นักศึกษาทั้งระบบ + PLO ทั้งระบบ ครั้งเดียวตอนเปิดหน้า
  // (หรือเมื่อ user/isAdmin เปลี่ยน เช่น เพิ่ง login เสร็จ) - instructor เห็นเฉพาะวิชาที่ตัวเองสอน
  // (กรองด้วย user.id) ส่วน admin เห็นทุกวิชา
  useEffect(() => {
    if (!user) return;
    (isAdmin ? listCourseOfferings() : listCourseOfferings(user.id))
      .then(setOfferings)
      .catch(() => {});
    listCourses().then(setCourses).catch(() => {});
    listStudents().then(setAllStudents).catch(() => {});
    listPLO().then(setAllPLOs).catch(() => {});
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
  // เฉพาะของ offering นี้, mapping ชิ้นงาน<->CLO และ CLO-PLO กรองเหลือเฉพาะของ "วิชา" นี้ (ทุก section -
  // ใช้เช็ค CLO ที่ถูกใช้แล้วในแท็บ "CLO"), รายชื่อลงทะเบียน) - เรียกทุกครั้งที่เปลี่ยนวิชาที่เลือก
  async function loadWorkspace(offeringId) {
    setLoadingWorkspace(true);
    setWorkspaceError("");
    try {
      const [items, clos, allItemClo, allCloPloMappings, offeringEnrollments] = await Promise.all([
        listAssessmentItems(offeringId),
        listCLO(),
        listItemCLO(),
        listCLOPLOMapping(),
        listEnrollments(offeringId),
      ]);
      setAssessmentItems(items);
      setAllCLOs(clos);
      const itemIds = new Set(items.map((i) => i.id));
      setItemCLOs(allItemClo.filter((ic) => itemIds.has(ic.item_id)));

      // targetCourseId มาจาก offeringId ตรงๆ (ไม่ใช้ courseId จาก closure ด้านนอก) กัน race กับ state
      // selectedOfferingId ที่อาจยังไม่อัปเดตทันตอนเรียกฟังก์ชันนี้
      const targetOffering = offerings.find((o) => o.id === offeringId);
      const courseCloIds = new Set(
        clos.filter((c) => c.course_id === targetOffering?.course_id).map((c) => c.id)
      );
      setItemCLOsForCourse(allItemClo.filter((ic) => courseCloIds.has(ic.clo_id)));
      setCloPloMappingsForCourse(allCloPloMappings.filter((m) => courseCloIds.has(m.clo_id)));

      setEnrollments(offeringEnrollments);
    } catch (err) {
      // 403 = ไม่ใช่ offering ของอาจารย์คนนี้ (เช่น URL เก่า/แชร์มาจากอาจารย์คนอื่น หรือถูกถอดออกจาก
      // วิชานี้แล้ว) - แยกข้อความให้เข้าใจได้ชัดกว่า error ทั่วไป (เช่น เน็ตหลุด/backend ล่ม)
      setWorkspaceError(
        err?.response?.status === 403
          ? "คุณไม่มีสิทธิ์เข้าถึงรายวิชานี้"
          : "โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้"
      );
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
      setItemCLOsForCourse([]);
      setCloPloMappingsForCourse([]);
      setEnrollments([]);
    }
  }

  // โหลด CLO + mapping ชิ้นงาน<->CLO และ CLO-PLO ของ "วิชา" นี้ใหม่ทั้งหมด (เรียกหลังสร้าง/แก้/ลบ CLO
  // หรือผูก/แก้/ถอด PLO สำเร็จ ในแท็บ "CLO")
  async function refreshCLOData() {
    const [clos, allItemClo, allCloPloMappings] = await Promise.all([
      listCLO(),
      listItemCLO(),
      listCLOPLOMapping(),
    ]);
    setAllCLOs(clos);
    const courseCloIds = new Set(clos.filter((c) => c.course_id === courseId).map((c) => c.id));
    setItemCLOsForCourse(allItemClo.filter((ic) => courseCloIds.has(ic.clo_id)));
    setCloPloMappingsForCourse(allCloPloMappings.filter((m) => courseCloIds.has(m.clo_id)));
    // itemCLOs (scoped เฉพาะ offering นี้) ก็อาจเปลี่ยนได้เหมือนกัน (เช่น ลบ CLO ที่ถูกผูกกับงานประเมิน
    // ของ offering นี้พอดี) - รีเฟรชให้ตรงกันด้วย เพื่อไม่ให้แท็บ "โครงสร้างการประเมิน" ค้างข้อมูลเก่า
    const itemIds = new Set(assessmentItems.map((i) => i.id));
    setItemCLOs(allItemClo.filter((ic) => itemIds.has(ic.item_id)));
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
          ยังไม่มีวิชาที่เปิดสอนให้จัดการ — ถ้าเป็นแอดมิน ไปที่ "จัดการระบบ" → "กำหนดอาจารย์ผู้สอน"
          เพื่อเปิดวิชาก่อน ถ้าเป็นอาจารย์ ให้ติดต่อแอดมินให้มอบหมายวิชาที่สอนให้
        </p>
      )}

      {!selectedOfferingId && offerings.length > 0 && (
        <div className="workspace-empty-state">
          <p>👆 เลือกวิชาที่เปิดสอนด้านบนเพื่อเริ่มต้น จะมี {TABS.length} แท็บให้ใช้งาน:</p>
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

          {activeTab === "course-info" && (
            <CourseInfoTab
              course={courseById[courseId]}
              courseCLOs={courseCLOs}
              cloPloMappingsForCourse={cloPloMappingsForCourse}
              allPLOs={allPLOs}
            />
          )}

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

          {activeTab === "clo-manage" && (
            <CLOManageTab
              courseId={courseId}
              curriculumId={curriculumId}
              courseCLOs={courseCLOs}
              itemCLOsForCourse={itemCLOsForCourse}
              cloPloMappingsForCourse={cloPloMappingsForCourse}
              allPLOs={allPLOs}
              onChanged={refreshCLOData}
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
 * ทำอะไร : แท็บ "ข้อมูลรายวิชา" — ข้อมูลวิชา (รหัส/ชื่อ/หน่วยกิต/หมวดหมู่) + PLO ที่วิชานี้เชื่อมอยู่ พร้อม
 *          ประเภทของ PLO และ CLO ที่ผูกกับ PLO นั้น (อ่านอย่างเดียว - แก้การผูกได้ที่แท็บ "CLO")
 *
 * เชื่อมกับ : PLO ของวิชาได้มาจาก clo_plo_mapping ของ CLO วิชานี้ (แหล่งเดียวกับที่ใช้คำนวณผลบรรลุ PLO)
 *             ไม่ใช่ course_plo - ใช้ข้อมูลที่ parent โหลดไว้แล้วทั้งหมด ไม่ยิง API เพิ่ม
 */
function CourseInfoTab({ course, courseCLOs, cloPloMappingsForCourse, allPLOs }) {
  const linkedPlos = useMemo(() => {
    const ploById = Object.fromEntries(allPLOs.map((p) => [p.id, p]));
    const cloById = Object.fromEntries(courseCLOs.map((c) => [c.id, c]));
    const byPloId = {};
    cloPloMappingsForCourse.forEach((m) => {
      const plo = ploById[m.plo_id];
      const clo = cloById[m.clo_id];
      if (!plo || !clo) return;
      (byPloId[plo.id] ??= { plo, clos: [] }).clos.push({ code: clo.code, weight: Number(m.weight_percent) });
    });
    return Object.values(byPloId)
      .map((entry) => ({
        ...entry,
        clos: entry.clos.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
      }))
      .sort((a, b) => a.plo.code.localeCompare(b.plo.code, undefined, { numeric: true }));
  }, [allPLOs, courseCLOs, cloPloMappingsForCourse]);

  if (!course) return null;

  return (
    <>
      <div className="workspace-section">
        <h2>
          <Info size={18} strokeWidth={2} /> ข้อมูลรายวิชา
        </h2>
        <dl className="course-info-list">
          <dt>รหัสวิชา</dt>
          <dd>{course.course_code}</dd>
          <dt>ชื่อวิชา</dt>
          <dd>
            {course.name_th}
            {course.name_en && <span className="course-info-sub"> ({course.name_en})</span>}
          </dd>
          <dt>หน่วยกิต</dt>
          <dd>{course.credit}</dd>
          <dt>หมวดหมู่วิชา</dt>
          <dd>{course.category || <span className="badge-muted">ยังไม่ระบุ</span>}</dd>
        </dl>
      </div>

      <div className="workspace-section">
        <h2>PLO ที่วิชานี้เชื่อมอยู่</h2>
        <p className="workspace-hint-inline">
          คิดจากการผูก CLO ของวิชานี้กับ PLO - แก้ไขการผูกได้ที่แท็บ "CLO"
        </p>
        {linkedPlos.length === 0 ? (
          <p className="student-list-empty">
            วิชานี้ยังไม่ได้เชื่อมกับ PLO ใดเลย - ไปผูก CLO กับ PLO ที่แท็บ "CLO" ก่อน
          </p>
        ) : (
          <table className="student-table">
            <thead>
              <tr>
                <th>รหัส PLO</th>
                <th>คำอธิบาย</th>
                <th>ประเภท</th>
                <th>CLO ที่ผูก (น้ำหนัก)</th>
              </tr>
            </thead>
            <tbody>
              {linkedPlos.map(({ plo, clos }) => (
                <tr key={plo.id} className="student-table-row">
                  <td className="student-table-cell">{plo.code}</td>
                  <td className="student-table-cell">{plo.description_th}</td>
                  <td className="student-table-cell">
                    {plo.category || <span className="badge-muted">ยังไม่ระบุ</span>}
                  </td>
                  <td className="student-table-cell">
                    {clos.map((c) => `${c.code} (${c.weight}%)`).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/**
 * ทำอะไร : แท็บ "นักศึกษาลงทะเบียน" — ตารางรายชื่อที่ลงแล้ว + เพิ่ม/ลบทีละคน + เพิ่ม/ลบทั้งรุ่นในคราว
 *          เดียว (bulk-by-cohort) + นำเข้ารายชื่อจาก Excel มหาวิทยาลัย (2026-09-28) + BulkEnrollPanel
 *          (เลือกหลายคน/อัปโหลดไฟล์ .csv-.xlsx ง่ายๆ) ต่อท้าย
 *
 * เชื่อมกับ : ฟีเจอร์เพิ่ม/ลบทั้งรุ่น (handleBulkByCohort/handleBulkRemoveByCohort) เป็นโค้ดเฉพาะของ
 *             แท็บนี้ ไม่ได้แยกเป็น component ร่วม (ต่างจากการเพิ่มแบบเลือกหลายคน/อัปโหลดไฟล์ที่ใช้
 *             BulkEnrollPanel ร่วมกับ AdminEnrollments.jsx)
 *
 *             "นำเข้ารายชื่อจาก Excel (มหาวิทยาลัย)" เป็นโค้ดเฉพาะของไฟล์นี้เท่านั้น (ตั้งใจไม่ใส่ใน
 *             BulkEnrollPanel.jsx เพราะไฟล์นั้นใช้ร่วมกับ AdminEnrollments.jsx ด้วย - ไม่อยากให้ฟีเจอร์นี้
 *             โผล่ในหน้าแอดมินโดยไม่ตั้งใจ เพราะแอดมินมี /admin/roster-import ของตัวเองอยู่แล้วที่ทำงาน
 *             คนละแบบ - หา/สร้าง course_offering เองจากไฟล์ แทนที่จะผูกกับ offering ที่เลือกอยู่ตรงๆ)
 *             เรียก POST /course-offerings/{id}/roster-import (คนละ endpoint กับ /admin/roster-import)
 *             ผ่าน importRosterToOffering() ใน api/client.js ใช้ ResultPanel component เดียวกับหน้า
 *             /admin/roster-import ซ้ำ (export มาจาก AdminRosterImport.jsx) ไม่สร้างวิชา/offering ใหม่
 *             และไม่แตะผู้สอนเลยไม่ว่ากรณีใด (สิทธิ์เช็คฝั่ง backend อีกชั้น: instructor นำเข้าได้เฉพาะ
 *             offering ของตัวเอง แอดมินนำเข้าได้ทุก offering)
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

  // สถานะของ "นำเข้ารายชื่อจาก Excel มหาวิทยาลัย" (2026-09-28) - ต่างจาก BulkEnrollPanel ด้านล่างที่
  // ลงทะเบียนได้เฉพาะนักศึกษาที่มีอยู่แล้ว ตัวนี้สร้างนักศึกษาใหม่ให้ได้ด้วย (ดู docstring หัวไฟล์)
  const [rosterFile, setRosterFile] = useState(null);
  const [rosterFileInputKey, setRosterFileInputKey] = useState(0);
  const [rosterPreview, setRosterPreview] = useState(null);
  const [rosterPreviewLoading, setRosterPreviewLoading] = useState(false);
  const [rosterPreviewError, setRosterPreviewError] = useState("");
  const [rosterCommitting, setRosterCommitting] = useState(false);
  const [rosterCommitResult, setRosterCommitResult] = useState(null);
  const [rosterCommitError, setRosterCommitError] = useState("");

  // 403 = ไม่ใช่ offering ของอาจารย์คนนี้ - ใช้ข้อความเดียวกับที่หน้านี้ใช้ที่อื่น (ดู loadWorkspace
  // ด้านล่าง) ไม่พึ่ง err.response.data.detail ตรงๆ เพราะ backend อาจเปลี่ยนคำได้อิสระ
  function describeRosterImportError(err) {
    if (err?.response?.status === 403) return "คุณไม่มีสิทธิ์เข้าถึงรายวิชานี้";
    return err?.response?.data?.detail;
  }

  async function handleRosterFileChange(e) {
    const f = e.target.files?.[0] ?? null;
    setRosterFile(f);
    setRosterPreview(null);
    setRosterPreviewError("");
    setRosterCommitResult(null);
    setRosterCommitError("");
    if (!f) return;
    setRosterPreviewLoading(true);
    try {
      const result = await importRosterToOffering(offeringId, f, true);
      setRosterPreview(result);
    } catch (err) {
      setRosterPreviewError(
        describeRosterImportError(err) || "อ่านไฟล์ไม่สำเร็จ - ตรวจสอบว่าเป็นไฟล์รายชื่อจากมหาวิทยาลัยจริง"
      );
    } finally {
      setRosterPreviewLoading(false);
    }
  }

  async function handleConfirmRosterImport() {
    if (!rosterFile) return;
    setRosterCommitting(true);
    setRosterCommitError("");
    try {
      const result = await importRosterToOffering(offeringId, rosterFile, false);
      setRosterCommitResult(result);
      await onChanged();
    } catch (err) {
      setRosterCommitError(describeRosterImportError(err) || "นำเข้าไม่สำเร็จ");
    } finally {
      setRosterCommitting(false);
    }
  }

  function handleResetRosterImport() {
    setRosterFile(null);
    setRosterPreview(null);
    setRosterPreviewError("");
    setRosterCommitResult(null);
    setRosterCommitError("");
    setRosterFileInputKey((k) => k + 1);
  }

  const rosterShown = rosterCommitResult || rosterPreview;
  const rosterCanConfirm = rosterPreview && !rosterCommitResult;

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

      <div className="workspace-section">
        <h2>
          <Upload size={18} strokeWidth={2} /> นำเข้ารายชื่อจาก Excel (มหาวิทยาลัย)
        </h2>
        <p className="workspace-hint-inline">
          ใช้ไฟล์ .xls/.xlsx ที่มหาวิทยาลัยส่งให้อาจารย์โดยตรง (มีรหัสวิชา/section/ผู้สอนในไฟล์เอง) - สร้าง
          นักศึกษาใหม่ให้อัตโนมัติถ้ายังไม่มีในระบบ ต่างจาก "อัปโหลดไฟล์รายชื่อ (.csv, .xlsx)" ด้านล่างที่
          ลงทะเบียนได้เฉพาะนักศึกษาที่มีอยู่แล้วเท่านั้น จะไม่มีอะไรถูกบันทึกจนกว่าจะกด "ยืนยันนำเข้าจริง"
        </p>
        <div className="workspace-inline-form">
          <input
            key={rosterFileInputKey}
            type="file"
            accept=".xls,.xlsx"
            onChange={handleRosterFileChange}
          />
          {(rosterPreview || rosterCommitResult) && (
            <button type="button" onClick={handleResetRosterImport}>
              เลือกไฟล์อื่น
            </button>
          )}
        </div>
        {rosterPreviewLoading && <p className="workspace-hint-inline">กำลังอ่านไฟล์...</p>}
        {rosterPreviewError && <p className="error-message">{rosterPreviewError}</p>}

        {rosterShown && <RosterResultPanel result={rosterShown} />}

        {rosterCanConfirm && (
          <>
            {rosterCommitError && <p className="error-message">{rosterCommitError}</p>}
            <button type="button" onClick={handleConfirmRosterImport} disabled={rosterCommitting}>
              {rosterCommitting ? "กำลังบันทึก..." : "ยืนยันนำเข้าจริง"}
            </button>
          </>
        )}

        {rosterCommitResult && (
          <p className="success-message">
            <CheckCircle2 size={16} strokeWidth={2} /> นำเข้าเสร็จสมบูรณ์
          </p>
        )}
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
 * ทำอะไร : แท็บ "CLO" (2026-09-28) — สร้าง/แก้ไข/ลบ CLO ของวิชานี้ (ใช้ร่วมกันทุก section) + ผูก/แก้
 *          น้ำหนัก/ถอด PLO เอง ไม่ต้องพึ่งแอดมินอีกต่อไป
 *
 * เชื่อมกับ : สิทธิ์เช็คฝั่ง backend ล้วนๆ (ownership check ที่มีอยู่แล้วใน POST/PUT/DELETE /clo และ
 *             /clo-plo-mapping - instructor ทำได้เฉพาะวิชาที่ตัวเองสอน, admin ทำได้ทุกวิชา) หน้านี้ไม่
 *             เช็คซ้ำฝั่ง frontend เลย ปล่อยให้ 403 ไหลมาแสดงตรงๆ - ปุ่มลบถูก disable ไว้ล่วงหน้าถ้า CLO
 *             ถูกใช้แล้ว (ผูกงานประเมินหรือ PLO อยู่) โดยเช็คจาก itemCLOsForCourse/cloPloMappingsForCourse
 *             ที่ส่งมาจาก parent (ดู loadWorkspace/refreshCLOData) - backend เช็คซ้ำอีกชั้นตอน DELETE
 *             จริงเสมอ (409 พร้อมเหตุผลภาษาไทย ถ้าปุ่มหลุด disable ไปได้ด้วยเหตุผลใดก็ตาม)
 *
 *             ใช้ CLODomainField (export จาก AdminCLO.jsx) และ buildDomainMismatchMessage (utils/
 *             cloDomain.js) แบบเดียวกับหน้าแอดมิน - กล่องยืนยันประเภทไม่ตรงกันเป็น modal ธรรมดา (คลาส
 *             .crud-modal เดียวกับที่ CrudManager.jsx ใช้) ไม่ใช่ window.confirm ตัวเองผูกได้ครั้งละ 1 คู่
 *             เท่านั้น (ไม่มี multi-select PLO) จึงไม่ต้องรวมหลายคู่ไว้ในกล่องเดียว
 *
 * ถ้าแก้ : PLO ที่เลือกได้ต้องกรองด้วย curriculumId ของวิชานี้เสมอ (backend ตอบ 422 ถ้าข้ามหลักสูตร - ดู
 *          require_same_curriculum ฝั่ง backend - หน้านี้กรองไว้ล่วงหน้าไม่ให้เลือกผิดได้ตั้งแต่ต้น)
 */
function CLOManageTab({
  courseId,
  curriculumId,
  courseCLOs,
  itemCLOsForCourse,
  cloPloMappingsForCourse,
  allPLOs,
  onChanged,
}) {
  // ฟอร์มสร้าง/แก้ไข CLO - editingCloId: null=ปิดฟอร์ม, "new"=กำลังเพิ่ม, id=กำลังแก้ไข CLO นั้น
  const [editingCloId, setEditingCloId] = useState(null);
  const [form, setForm] = useState({ code: "", description: "", pass_threshold_percent: "60", domain: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ฟอร์มผูก CLO กับ PLO (แยกต่างหากจากฟอร์ม CLO ด้านบน)
  const [mappingCloId, setMappingCloId] = useState("");
  const [mappingPloId, setMappingPloId] = useState("");
  const [mappingWarning, setMappingWarning] = useState(null);
  const [mappingError, setMappingError] = useState("");
  const [mappingSaving, setMappingSaving] = useState(false);
  const [pendingMappingConfirm, setPendingMappingConfirm] = useState(false);
  const [editingMappingId, setEditingMappingId] = useState(null);
  const [editingWeight, setEditingWeight] = useState("");

  const ploById = useMemo(() => Object.fromEntries(allPLOs.map((p) => [p.id, p])), [allPLOs]);
  // เฉพาะ PLO ของหลักสูตรที่วิชานี้อยู่เท่านั้น (กันเลือกข้ามหลักสูตรตั้งแต่ต้น - backend ตอบ 422 ซ้ำ
  // อีกชั้นถ้าหลุดมาได้) - รูปแบบ label เดียวกับหน้า /admin/clo-plo-mapping ("รหัส · คำอธิบาย (ประเภท)")
  const ploOptions = useMemo(
    () =>
      allPLOs
        .filter((p) => p.curriculum_id === curriculumId)
        .map((p) => ({ value: p.id, label: `${p.code} · ${p.description_th} (${p.category})` })),
    [allPLOs, curriculumId]
  );
  const cloOptionsForMapping = useMemo(
    () => courseCLOs.map((c) => ({ value: c.id, label: `${c.code}: ${c.description}` })),
    [courseCLOs]
  );

  const itemCLOCountByCloId = useMemo(() => {
    const counts = {};
    itemCLOsForCourse.forEach((ic) => {
      counts[ic.clo_id] = (counts[ic.clo_id] || 0) + 1;
    });
    return counts;
  }, [itemCLOsForCourse]);

  const ploMappingsByCloId = useMemo(() => {
    const map = {};
    cloPloMappingsForCourse.forEach((m) => {
      (map[m.clo_id] ??= []).push(m);
    });
    return map;
  }, [cloPloMappingsForCourse]);

  function usageReason(cloId) {
    const parts = [];
    if (itemCLOCountByCloId[cloId]) parts.push(`งานประเมิน ${itemCLOCountByCloId[cloId]} รายการ`);
    const mappingCount = ploMappingsByCloId[cloId]?.length || 0;
    if (mappingCount) parts.push(`PLO ${mappingCount} รายการ`);
    return parts;
  }

  // 403 = ไม่ใช่ผู้สอนวิชานี้ (ownership check ฝั่ง backend) - ใช้ข้อความเดียวกับที่หน้านี้ใช้ที่อื่น
  function describeCloError(err, fallback) {
    if (err?.response?.status === 403) return "คุณไม่มีสิทธิ์เข้าถึงรายวิชานี้";
    return err?.response?.data?.detail || fallback;
  }

  function startCreate() {
    setForm({ code: "", description: "", pass_threshold_percent: "60", domain: "" });
    setFormError("");
    setEditingCloId("new");
  }

  function startEdit(clo) {
    setForm({
      code: clo.code,
      description: clo.description,
      pass_threshold_percent: String(clo.pass_threshold_percent),
      domain: clo.domain || "",
    });
    setFormError("");
    setEditingCloId(clo.id);
  }

  function cancelCloForm() {
    setEditingCloId(null);
    setFormError("");
  }

  async function handleSaveCLO(e) {
    e.preventDefault();
    if (!form.domain) {
      setFormError('กรุณาเลือก "ประเภท" ก่อนบันทึก');
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        code: form.code.trim(),
        description: form.description.trim(),
        pass_threshold_percent: Number(form.pass_threshold_percent),
        domain: form.domain,
      };
      if (editingCloId === "new") {
        await createCLO({ course_id: courseId, ...payload });
      } else {
        await updateCLO(editingCloId, payload);
      }
      setEditingCloId(null);
      await onChanged();
    } catch (err) {
      setFormError(describeCloError(err, "บันทึกไม่สำเร็จ"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCLO(clo) {
    if (usageReason(clo.id).length > 0) return; // ปุ่มถูก disable ไว้แล้ว - กันเผื่อเรียกตรงๆ
    if (!window.confirm(`ยืนยันการลบ CLO "${clo.code}"? การกระทำนี้ย้อนกลับไม่ได้`)) return;
    setDeleteError("");
    try {
      await deleteCLO(clo.id);
      await onChanged();
    } catch (err) {
      setDeleteError(describeCloError(err, "ลบไม่สำเร็จ"));
    }
  }

  // เช็ค domain/category ไม่ตรงกัน real-time ตอนเลือกครบทั้ง CLO และ PLO (เหมือน AdminCLOPLOMapping.jsx
  // ทุกประการ - เรียก endpoint เดิม ไม่เขียนตรรกะเทียบใหม่ แค่ประกอบข้อความเองให้ตรงฟอร์แมตเดียวกัน)
  useEffect(() => {
    if (!mappingCloId || !mappingPloId) {
      setMappingWarning(null);
      return;
    }
    let cancelled = false;
    checkCLOPLODomainMatch(mappingCloId, mappingPloId)
      .then((result) => {
        if (cancelled) return;
        if (!result.mismatch) {
          setMappingWarning(null);
          return;
        }
        const clo = courseCLOs.find((c) => c.id === Number(mappingCloId));
        const plo = ploById[Number(mappingPloId)];
        const cloLabel = clo ? `${clo.code} (${CLO_DOMAIN_LABEL_TH[clo.domain] || clo.domain})` : "CLO นี้";
        const ploLabel = plo ? `${plo.code} (${plo.category})` : "PLO นี้";
        setMappingWarning({ message: buildDomainMismatchMessage(cloLabel, ploLabel) });
      })
      .catch(() => {
        if (!cancelled) setMappingWarning(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mappingCloId, mappingPloId, courseCLOs, ploById]);

  async function performCreateMapping() {
    setMappingSaving(true);
    setMappingError("");
    try {
      await createCLOPLOMapping({ clo_id: Number(mappingCloId), plo_id: Number(mappingPloId) });
      setMappingCloId("");
      setMappingPloId("");
      setMappingWarning(null);
      setPendingMappingConfirm(false);
      await onChanged();
    } catch (err) {
      setMappingError(describeCloError(err, "ผูกไม่สำเร็จ"));
      setPendingMappingConfirm(false);
    } finally {
      setMappingSaving(false);
    }
  }

  // มีคำเตือนอยู่ -> โชว์กล่องยืนยันก่อน (requireConfirmOnWarning แบบเดียวกับ CrudManager.jsx) ไม่มี ->
  // ผูกเลย
  function handleSubmitMapping(e) {
    e.preventDefault();
    if (!mappingCloId || !mappingPloId) return;
    if (mappingWarning) {
      setPendingMappingConfirm(true);
      return;
    }
    performCreateMapping();
  }

  function startEditWeight(mapping) {
    setEditingMappingId(mapping.id);
    setEditingWeight(String(mapping.weight_percent));
  }

  async function handleSaveWeight(mapping) {
    setMappingError("");
    try {
      await updateCLOPLOMapping(mapping.id, { weight_percent: Number(editingWeight) });
      setEditingMappingId(null);
      await onChanged();
    } catch (err) {
      setMappingError(describeCloError(err, "แก้น้ำหนักไม่สำเร็จ"));
    }
  }

  async function handleDeleteMapping(mappingId) {
    if (!window.confirm("ยืนยันการถอด PLO นี้ออก?")) return;
    setMappingError("");
    try {
      await deleteCLOPLOMapping(mappingId);
      await onChanged();
    } catch (err) {
      setMappingError(describeCloError(err, "ถอดไม่สำเร็จ"));
    }
  }

  return (
    <>
      <div className="workspace-section">
        <h2>
          <Flag size={18} strokeWidth={2} /> CLO ของวิชานี้
        </h2>
        <p className="workspace-hint-inline">
          CLO ใช้ร่วมกันทุก section ของวิชานี้ การแก้ไขจะมีผลกับทุก section
        </p>
        {deleteError && <p className="error-message">{deleteError}</p>}

        <table className="student-table">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>คำอธิบาย</th>
              <th>ประเภท</th>
              <th>เกณฑ์ผ่าน (%)</th>
              <th>PLO ที่ผูก</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courseCLOs.map((clo) => {
              const reasons = usageReason(clo.id);
              const used = reasons.length > 0;
              const mappings = ploMappingsByCloId[clo.id] || [];
              return (
                <tr key={clo.id} className="student-table-row">
                  <td className="student-table-cell">{clo.code}</td>
                  <td className="student-table-cell">{clo.description}</td>
                  <td className="student-table-cell">
                    {clo.domain ? (
                      CLO_DOMAIN_LABEL_TH[clo.domain] || clo.domain
                    ) : (
                      <span className="badge-muted">ยังไม่ระบุ</span>
                    )}
                  </td>
                  <td className="student-table-cell">{clo.pass_threshold_percent}</td>
                  <td className="student-table-cell">
                    {mappings.length > 0
                      ? mappings.map((m) => ploById[m.plo_id]?.code ?? m.plo_id).join(", ")
                      : "-"}
                  </td>
                  <td className="student-table-cell">
                    <button type="button" onClick={() => startEdit(clo)} disabled={editingCloId !== null}>
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      className="icon-btn-delete"
                      title={used ? `ลบไม่ได้ - ผูกกับ${reasons.join(" และ ")}อยู่` : "ลบ"}
                      onClick={() => handleDeleteCLO(clo)}
                      disabled={used || editingCloId !== null}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {courseCLOs.length === 0 && (
          <p className="student-list-empty">วิชานี้ยังไม่มี CLO - เพิ่มข้อแรกด้านล่างได้เลย</p>
        )}

        {editingCloId !== null ? (
          <form onSubmit={handleSaveCLO} className="workspace-inline-form">
            <div className="form-field">
              <label htmlFor="clo-manage-code">รหัส CLO (เช่น CLO1)</label>
              <input
                id="clo-manage-code"
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="clo-manage-desc">คำอธิบาย</label>
              <input
                id="clo-manage-desc"
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="clo-manage-domain">ประเภท</label>
              <CLODomainField value={form.domain} onChange={(v) => setForm((f) => ({ ...f, domain: v }))} />
            </div>
            <div className="form-field">
              <label htmlFor="clo-manage-threshold">เกณฑ์ผ่าน (%)</label>
              <input
                id="clo-manage-threshold"
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.pass_threshold_percent}
                onChange={(e) => setForm((f) => ({ ...f, pass_threshold_percent: e.target.value }))}
                required
              />
            </div>
            {formError && <p className="error-message">{formError}</p>}
            <div className="workspace-inline-form">
              <button type="submit" disabled={saving}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button type="button" onClick={cancelCloForm} disabled={saving}>
                ยกเลิก
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={startCreate}>
            + เพิ่ม CLO
          </button>
        )}
      </div>

      <div className="workspace-section">
        <h2>ผูก CLO กับ PLO</h2>
        {mappingError && <p className="error-message">{mappingError}</p>}
        <form onSubmit={handleSubmitMapping} className="workspace-inline-form">
          <div className="form-field">
            <label htmlFor="clo-manage-mapping-clo">CLO</label>
            <select
              id="clo-manage-mapping-clo"
              value={mappingCloId}
              onChange={(e) => setMappingCloId(e.target.value)}
              required
            >
              <option value="">-- เลือก CLO --</option>
              {cloOptionsForMapping.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="clo-manage-mapping-plo">PLO</label>
            <select
              id="clo-manage-mapping-plo"
              value={mappingPloId}
              onChange={(e) => setMappingPloId(e.target.value)}
              required
            >
              <option value="">-- เลือก PLO --</option>
              {ploOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={mappingSaving || !mappingCloId || !mappingPloId}>
            {mappingSaving ? "กำลังผูก..." : "ผูก"}
          </button>
        </form>
        {mappingWarning && <p className="crud-cross-field-warning">{mappingWarning.message}</p>}
        {courseCLOs.length === 0 && (
          <p className="workspace-hint-inline">วิชานี้ยังไม่มี CLO เลย - เพิ่ม CLO ก่อนถึงจะเลือกผูกที่นี่ได้</p>
        )}

        <table className="student-table">
          <thead>
            <tr>
              <th>CLO</th>
              <th>PLO</th>
              <th>น้ำหนัก (%)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cloPloMappingsForCourse.map((m) => (
              <tr key={m.id} className="student-table-row">
                <td className="student-table-cell">
                  {courseCLOs.find((c) => c.id === m.clo_id)?.code ?? m.clo_id}
                </td>
                <td className="student-table-cell">{ploById[m.plo_id]?.code ?? m.plo_id}</td>
                <td className="student-table-cell">
                  {editingMappingId === m.id ? (
                    <span className="workspace-inline-form">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        value={editingWeight}
                        onChange={(e) => setEditingWeight(e.target.value)}
                      />
                      <button type="button" onClick={() => handleSaveWeight(m)}>
                        บันทึก
                      </button>
                      <button type="button" onClick={() => setEditingMappingId(null)}>
                        ยกเลิก
                      </button>
                    </span>
                  ) : (
                    <>
                      {m.weight_percent}{" "}
                      <button type="button" onClick={() => startEditWeight(m)}>
                        แก้ไข
                      </button>
                    </>
                  )}
                </td>
                <td className="student-table-cell">
                  <button
                    type="button"
                    className="icon-btn-delete"
                    title="ถอด"
                    onClick={() => handleDeleteMapping(m.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cloPloMappingsForCourse.length === 0 && (
          <p className="student-list-empty">วิชานี้ยังไม่มีการผูก CLO กับ PLO</p>
        )}
      </div>

      {pendingMappingConfirm && (
        <div className="crud-modal-backdrop" onClick={() => setPendingMappingConfirm(false)}>
          <div className="crud-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crud-modal-header">
              <h3>ประเภทไม่ตรงกัน</h3>
            </div>
            <p className="crud-cross-field-warning">{mappingWarning?.message}</p>
            <div className="crud-form-actions">
              <button type="button" disabled={mappingSaving} onClick={performCreateMapping}>
                {mappingSaving ? "กำลังบันทึก..." : "เชื่อมต่อ"}
              </button>
              <button type="button" disabled={mappingSaving} onClick={() => setPendingMappingConfirm(false)}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * ทำอะไร : แท็บ "โครงสร้างการประเมิน" — 2 ส่วนเรียงกันตามลำดับงานจริง: (1) สร้างงานประเมิน (ควิซ/สอบ/
 *          การบ้าน ฯลฯ) (2) ผูกงานประเมินแต่ละชิ้นเข้ากับ CLO พร้อมกำหนดน้ำหนัก (%) - สร้าง/แก้ไข/ลบ CLO
 *          เอง ย้ายไปแท็บ "CLO" (CLOManageTab) แยกต่างหากแล้ว (2026-09-28) ส่วนนี้เหลือแค่ตารางอ้างอิง
 *          CLO แบบอ่านอย่างเดียวไว้เลือกตอนผูกงานประเมิน
 *
 * เชื่อมกับ : ไม่มีการผูก PLO ในหน้านี้ (ย้ายไปแท็บ "CLO" แล้ว) - โค้ดส่วนนี้เป็นโค้ดเฉพาะของ workspace
 *             ไฟล์นี้ ไม่ได้แยกเป็น component ร่วมกับหน้าไหน
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
}) {
  // สถานะของฟอร์ม "เพิ่มงานประเมิน"
  const [name, setName] = useState("");
  const [type, setType] = useState(ASSESSMENT_TYPE_OPTIONS[0]);
  const [domain, setDomain] = useState("");
  const [totalScore, setTotalScore] = useState("");
  const [itemError, setItemError] = useState("");

  // สถานะของฟอร์ม "ผูกงานประเมินกับ CLO"
  const [mapItemId, setMapItemId] = useState("");
  const [mapCloId, setMapCloId] = useState("");
  const [mapWeight, setMapWeight] = useState("");
  const [mapError, setMapError] = useState("");

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

  // สร้างงานประเมินใหม่ - คะแนนเต็มต้องเป็นจำนวนเต็มมากกว่า 0
  async function handleAddItem(e) {
    e.preventDefault();
    setItemError("");
    if (!name.trim() || totalScore === "") return;
    if (!domain) {
      setItemError('กรุณาเลือก "ด้านการเรียนรู้" ก่อนเพิ่มงานประเมิน');
      return;
    }
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
        domain,
        total_score: parsedTotal,
      });
      setName("");
      setDomain("");
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
          สร้าง/แก้ไข/ลบ CLO ได้ที่แท็บ "CLO" - ตารางนี้แสดงไว้ให้อ้างอิงเลือกตอนสร้างงานประเมิน+ผูกน้ำหนัก
          ด้านล่างเท่านั้น
        </p>

        <table className="student-table">
          <thead>
            <tr>
              <th>รหัส CLO</th>
              <th>คำอธิบาย</th>
              <th>เกณฑ์ผ่าน (%)</th>
            </tr>
          </thead>
          <tbody>
            {courseCLOs.map((clo) => (
              <tr key={clo.id} className="student-table-row">
                <td className="student-table-cell">{clo.code}</td>
                <td className="student-table-cell">{clo.description}</td>
                <td className="student-table-cell">{clo.pass_threshold_percent}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {courseCLOs.length === 0 && (
          <p className="student-list-empty">วิชานี้ยังไม่มี CLO - แจ้งแอดมินให้สร้างก่อน</p>
        )}
      </div>

      <div className="workspace-section">
        <h2>งานประเมิน (Assessment Item)</h2>
        {itemError && <p className="error-message">{itemError}</p>}
        <table className="student-table">
          <thead>
            <tr>
              <th>ชื่องาน</th>
              <th>ประเภท</th>
              <th>ด้านการเรียนรู้</th>
              <th>คะแนนเต็ม</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assessmentItems.map((item) => (
              <tr key={item.id} className="student-table-row">
                <td className="student-table-cell">{item.name}</td>
                <td className="student-table-cell">{item.type}</td>
                <td className="student-table-cell">
                  {item.domain ? (
                    CLO_DOMAIN_LABEL_TH[item.domain] || item.domain
                  ) : (
                    <span className="badge-muted">ยังไม่ระบุ</span>
                  )}
                </td>
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
            <label htmlFor="new-item-domain">ด้านการเรียนรู้ (ประเภทเดียวกับ CLO/PLO)</label>
            <CLODomainField value={domain} onChange={setDomain} />
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
            วิชานี้ยังไม่มี CLO เลย - ไปสร้างที่แท็บ "CLO" ก่อน ถึงจะเลือกผูกที่นี่ได้
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

