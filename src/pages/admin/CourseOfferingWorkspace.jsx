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
  updateEnrollment,
  deleteEnrollment,
  bulkEnrollByCohort,
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

function EnrollmentTab({ offeringId, curriculumId, enrollments, studentById, allStudents, onChanged }) {
  const [gradeEdits, setGradeEdits] = useState({});
  const [rowError, setRowError] = useState({});
  const [addSearch, setAddSearch] = useState("");
  const [addStudentId, setAddStudentId] = useState("");
  const [addError, setAddError] = useState("");
  const [removeError, setRemoveError] = useState("");

  const [cohortYear, setCohortYear] = useState("");
  const [cohortSubmitting, setCohortSubmitting] = useState(false);
  const [cohortError, setCohortError] = useState("");
  const [cohortResultMessage, setCohortResultMessage] = useState("");

  // รายชื่อนักศึกษาที่ลงทะเบียนวิชานี้ไปแล้วในหมู่/section อื่น (วิชาเดียวกัน ภาคเรียนเดียวกัน)
  // ใช้แยกไม่ให้ปนกับคนที่ยังไม่ได้ลงทะเบียนเลย เช่น รุ่น 69 ที่แบ่งเป็น 2 หมู่เพราะคนเยอะ
  const [otherSectionMap, setOtherSectionMap] = useState({});

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

  const enrolledRoster = useMemo(
    () =>
      enrollments
        .map((e) => ({ enrollment: e, student: studentById[e.student_id] }))
        .filter((r) => r.student)
        .sort((a, b) => a.student.id.localeCompare(b.student.id)),
    [enrollments, studentById]
  );

  const enrolledIds = useMemo(() => new Set(enrollments.map((e) => e.student_id)), [enrollments]);

  const availableStudents = useMemo(() => {
    const candidates = allStudents.filter((s) => !enrolledIds.has(s.id) && !otherSectionMap[s.id]);
    if (!addSearch.trim()) return candidates;
    const q = addSearch.trim().toLowerCase();
    return candidates.filter(
      (s) => s.id.toLowerCase().includes(q) || `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
    );
  }, [allStudents, enrolledIds, otherSectionMap, addSearch]);

  const cohortOptions = useMemo(() => {
    const years = new Set(
      allStudents.filter((s) => s.curriculum_id === curriculumId).map((s) => s.cohort_year)
    );
    return Array.from(years).sort((a, b) => a - b);
  }, [allStudents, curriculumId]);

  const cohortCandidates = useMemo(() => {
    if (!cohortYear) return [];
    return allStudents.filter(
      (s) =>
        s.curriculum_id === curriculumId &&
        s.cohort_year === Number(cohortYear) &&
        !enrolledIds.has(s.id)
    );
  }, [allStudents, curriculumId, cohortYear, enrolledIds]);

  const cohortOtherSectionStudents = useMemo(
    () => cohortCandidates.filter((s) => otherSectionMap[s.id]),
    [cohortCandidates, otherSectionMap]
  );

  const cohortPreviewCount = useMemo(
    () => cohortCandidates.filter((s) => !otherSectionMap[s.id]).length,
    [cohortCandidates, otherSectionMap]
  );

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

  function gradeValue(enrollment) {
    if (gradeEdits[enrollment.id] !== undefined) return gradeEdits[enrollment.id];
    return enrollment.final_grade ?? "";
  }

  async function handleSaveGrade(enrollment) {
    setRowError((prev) => ({ ...prev, [enrollment.id]: "" }));
    try {
      await updateEnrollment(enrollment.id, { final_grade: gradeValue(enrollment) || null });
      await onChanged();
    } catch {
      setRowError((prev) => ({ ...prev, [enrollment.id]: "บันทึกไม่สำเร็จ" }));
    }
  }

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
            <th>เกรด (final_grade)</th>
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
                <input
                  type="text"
                  className="score-input"
                  value={gradeValue(enrollment)}
                  onChange={(e) =>
                    setGradeEdits((prev) => ({ ...prev, [enrollment.id]: e.target.value }))
                  }
                />
                <button type="button" onClick={() => handleSaveGrade(enrollment)}>
                  บันทึก
                </button>
                {rowError[enrollment.id] && (
                  <p className="error-message score-row-error">{rowError[enrollment.id]}</p>
                )}
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

      <BulkEnrollPanel offeringId={offeringId} allStudents={allStudents} onChanged={onChanged} />
    </>
  );
}

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
  const [name, setName] = useState("");
  const [type, setType] = useState(ASSESSMENT_TYPE_OPTIONS[0]);
  const [totalScore, setTotalScore] = useState("");
  const [itemError, setItemError] = useState("");

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

  function addCloRow() {
    const rowId = cloRowIdRef.current++;
    setCloRows((prev) => [...prev, { rowId, description: "", threshold: "", error: "" }]);
  }

  function removeCloRow(rowId) {
    setCloRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  function updateCloRow(rowId, field, value) {
    setCloRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value, error: "" } : r))
    );
  }

  function isValidThresholdInput(value) {
    if (value === "" || value === null || value === undefined) return false;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 100;
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
        error = "เกณฑ์ผ่านต้องเป็นตัวเลข 0-100";
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

  async function handleAddItem(e) {
    e.preventDefault();
    setItemError("");
    if (!name.trim() || totalScore === "") return;
    try {
      await createAssessmentItem({
        offering_id: offeringId,
        name: name.trim(),
        type,
        total_score: Number(totalScore),
      });
      setName("");
      setTotalScore("");
      await onStructureChanged();
    } catch {
      setItemError("เพิ่มงานประเมินไม่สำเร็จ");
    }
  }

  async function handleDeleteItem(id) {
    if (!window.confirm("ยืนยันการลบงานประเมินนี้? การกระทำนี้ย้อนกลับไม่ได้")) return;
    try {
      await deleteAssessmentItem(id);
      await onStructureChanged();
    } catch {
      setItemError("ลบไม่สำเร็จ");
    }
  }

  async function handleAddMapping(e) {
    e.preventDefault();
    setMapError("");
    if (!mapItemId || !mapCloId || mapWeight === "") return;
    try {
      await createItemCLO({
        item_id: Number(mapItemId),
        clo_id: Number(mapCloId),
        weight_percent: Number(mapWeight),
      });
      setMapItemId("");
      setMapCloId("");
      setMapWeight("");
      await onItemCLOChanged();
    } catch {
      setMapError("เพิ่ม mapping ไม่สำเร็จ (อาจมี mapping นี้อยู่แล้ว)");
    }
  }

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
                      step="0.01"
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
              step="0.01"
              min="0"
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
              step="0.01"
              min="0"
              value={mapWeight}
              onChange={(e) => setMapWeight(e.target.value)}
              required
            />
          </div>
          <button type="submit">+ เพิ่ม mapping</button>
        </form>
      </div>
    </>
  );
}

