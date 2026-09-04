import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Trash2,
  UserPlus,
  ListChecks,
  PencilLine,
  Target,
  ChevronDown,
  ChevronRight,
  Users,
  Upload,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
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
  listPLO,
  listCLOPLOMapping,
  createCLOPLOMapping,
  deleteCLOPLOMapping,
  listEnrollments,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
  bulkEnrollByCohort,
  bulkEnrollStudents,
  bulkEnrollUpload,
  getSiblingSectionEnrollments,
  listStudents,
  getOfferingStudentScores,
  getOfferingCLOAchievement,
  updateStudentScore,
  createStudentScore,
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
  const [offeringScores, setOfferingScores] = useState([]);
  const [cloAchievement, setCloAchievement] = useState(null);

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

  const offeringOptions = useMemo(
    () =>
      offerings.map((o) => {
        const course = courseById[o.course_id];
        const label = course
          ? `${course.course_code} ${course.name_th} (${o.academic_year}/${o.semester}) หมู่ ${o.section}`
          : `วิชา #${o.id}`;
        return { value: o.id, label };
      }),
    [offerings, courseById]
  );

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
      const [items, clos, allItemClo, offeringEnrollments, scores, achievement] =
        await Promise.all([
          listAssessmentItems(offeringId),
          listCLO(),
          listItemCLO(),
          listEnrollments(offeringId),
          getOfferingStudentScores(offeringId),
          getOfferingCLOAchievement(offeringId),
        ]);
      setAssessmentItems(items);
      setAllCLOs(clos);
      const itemIds = new Set(items.map((i) => i.id));
      setItemCLOs(allItemClo.filter((ic) => itemIds.has(ic.item_id)));
      setEnrollments(offeringEnrollments);
      setOfferingScores(scores);
      setCloAchievement(achievement);
    } catch {
      setWorkspaceError("โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
    } finally {
      setLoadingWorkspace(false);
    }
  }

  function handleSelectOffering(e) {
    const id = e.target.value;
    setSelectedOfferingId(id);
    if (id) {
      loadWorkspace(Number(id));
    } else {
      setAssessmentItems([]);
      setAllCLOs([]);
      setItemCLOs([]);
      setEnrollments([]);
      setOfferingScores([]);
      setCloAchievement(null);
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

  async function refreshScoresAndAchievement() {
    const [scores, achievement] = await Promise.all([
      getOfferingStudentScores(Number(selectedOfferingId)),
      getOfferingCLOAchievement(Number(selectedOfferingId)),
    ]);
    setOfferingScores(scores);
    setCloAchievement(achievement);
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
        <select id="offering-select" value={selectedOfferingId} onChange={handleSelectOffering}>
          <option value="">-- เลือกวิชา --</option>
          {offeringOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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

          {activeTab === "scores" && (
            <ScoresTab
              assessmentItems={assessmentItems}
              enrollments={enrollments}
              studentById={studentById}
              offeringScores={offeringScores}
              onSaved={refreshScoresAndAchievement}
            />
          )}

          {activeTab === "clo" && (
            <CLOTab
              cloAchievement={cloAchievement}
              itemCLOs={itemCLOs}
              assessmentItems={assessmentItems}
            />
          )}
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

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [multiSubmitting, setMultiSubmitting] = useState(false);
  const [multiError, setMultiError] = useState("");
  const [multiResultMessage, setMultiResultMessage] = useState("");

  const [uploadFile, setUploadFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadResult, setUploadResult] = useState(null);

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

  // แสดงแยกต่างหาก (ไม่ปนกับ availableStudents) เพื่อให้เห็นชัดว่าใครลงทะเบียนวิชานี้ไปแล้วที่หมู่ไหน
  const otherSectionAvailableStudents = useMemo(() => {
    const candidates = allStudents.filter((s) => !enrolledIds.has(s.id) && otherSectionMap[s.id]);
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

  const allVisibleSelected =
    availableStudents.length > 0 && availableStudents.every((s) => selectedIds.has(s.id));

  function toggleOne(studentId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        availableStudents.forEach((s) => next.delete(s.id));
        return next;
      }
      const next = new Set(prev);
      availableStudents.forEach((s) => next.add(s.id));
      return next;
    });
  }

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

  async function handleAddSelected() {
    if (selectedIds.size === 0) return;
    setMultiSubmitting(true);
    setMultiError("");
    setMultiResultMessage("");
    try {
      const result = await bulkEnrollStudents(offeringId, Array.from(selectedIds));
      setMultiResultMessage(
        `เพิ่มสำเร็จ ${result.added_count} คน${
          result.already_enrolled.length > 0 ? `, ข้าม ${result.already_enrolled.length} คน` : ""
        }${
          result.already_in_other_section.length > 0
            ? `, ข้าม ${result.already_in_other_section.length} คนที่อยู่หมู่อื่นของวิชานี้แล้ว`
            : ""
        }`
      );
      setSelectedIds(new Set());
      await onChanged();
    } catch (err) {
      setMultiError(err?.response?.data?.detail || "เพิ่มนักศึกษาที่เลือกไม่สำเร็จ");
    } finally {
      setMultiSubmitting(false);
    }
  }

  function handleFileChange(e) {
    setUploadFile(e.target.files?.[0] ?? null);
    setUploadResult(null);
    setUploadError("");
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setUploadSubmitting(true);
    setUploadError("");
    setUploadResult(null);
    try {
      const result = await bulkEnrollUpload(offeringId, uploadFile);
      setUploadResult(result);
      setUploadFile(null);
      setFileInputKey((k) => k + 1);
      await onChanged();
    } catch (err) {
      setUploadError(err?.response?.data?.detail || "อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      setUploadSubmitting(false);
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

      <div className="workspace-section">
        <h2>เลือกหลายคนพร้อมกัน</h2>
        {multiError && <p className="error-message">{multiError}</p>}
        <div className="workspace-inline-form">
          <button type="button" onClick={toggleSelectAllVisible} disabled={availableStudents.length === 0}>
            {allVisibleSelected ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
          </button>
        </div>
        <div className="enroll-multiselect-list">
          {availableStudents.map((s) => (
            <label key={s.id} className="enroll-multiselect-item">
              <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleOne(s.id)} />
              {s.id} {s.first_name} {s.last_name}
            </label>
          ))}
          {availableStudents.length === 0 && (
            <p className="student-list-empty">ไม่พบนักศึกษาที่ยังไม่ได้ลงทะเบียน</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddSelected}
          disabled={selectedIds.size === 0 || multiSubmitting}
        >
          {multiSubmitting ? "กำลังเพิ่ม..." : `เพิ่มที่เลือก (${selectedIds.size} คน)`}
        </button>
        {multiResultMessage && <p className="success-message">{multiResultMessage}</p>}

        {otherSectionAvailableStudents.length > 0 && (
          <div className="enroll-other-section-note">
            <p className="workspace-hint-inline">
              นักศึกษาที่ลงทะเบียนวิชานี้ไปแล้วที่หมู่อื่น ({otherSectionAvailableStudents.length} คน —
              ไม่แสดงในรายการด้านบนเพื่อไม่ให้เพิ่มซ้ำ):
            </p>
            <ul className="enroll-other-section-list">
              {otherSectionAvailableStudents.map((s) => (
                <li key={s.id}>
                  {s.id} {s.first_name} {s.last_name} — หมู่ {otherSectionMap[s.id]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="workspace-section">
        <h2>
          <Upload size={18} strokeWidth={2} /> อัปโหลดไฟล์รายชื่อ (.csv, .xlsx)
        </h2>
        {uploadError && <p className="error-message">{uploadError}</p>}
        <div className="workspace-inline-form">
          <input key={fileInputKey} type="file" accept=".csv,.xlsx" onChange={handleFileChange} />
          <button type="button" onClick={handleUpload} disabled={!uploadFile || uploadSubmitting}>
            {uploadSubmitting ? "กำลังอัปโหลด..." : "อัปโหลดและลงทะเบียน"}
          </button>
        </div>
        {uploadResult && (
          <div className="upload-result">
            <p className="success-message">
              เพิ่มสำเร็จ {uploadResult.added_count} คน
              {uploadResult.already_enrolled.length > 0 &&
                `, ข้าม (ลงทะเบียนแล้ว) ${uploadResult.already_enrolled.length} คน`}
              {uploadResult.already_in_other_section.length > 0 &&
                `, ข้าม (อยู่หมู่อื่นของวิชานี้แล้ว) ${uploadResult.already_in_other_section.length} คน`}
              {uploadResult.not_found.length > 0 && `, ไม่พบในระบบ ${uploadResult.not_found.length} คน`}
              {uploadResult.wrong_curriculum.length > 0 &&
                `, คนละหลักสูตร ${uploadResult.wrong_curriculum.length} คน`}
            </p>
            {uploadResult.not_found.length > 0 && (
              <div className="upload-result-list">
                <label>รหัสที่ไม่พบในระบบ (คัดลอกไปตรวจสอบได้):</label>
                <textarea readOnly value={uploadResult.not_found.join(", ")} onClick={(e) => e.target.select()} />
              </div>
            )}
            {uploadResult.wrong_curriculum.length > 0 && (
              <div className="upload-result-list">
                <label>รหัสที่อยู่คนละหลักสูตรกับวิชานี้ (ไม่ได้ลงทะเบียนให้):</label>
                <textarea
                  readOnly
                  value={uploadResult.wrong_curriculum.join(", ")}
                  onClick={(e) => e.target.select()}
                />
              </div>
            )}
            {uploadResult.already_in_other_section.length > 0 && (
              <div className="upload-result-list">
                <label>รหัสที่ลงทะเบียนวิชานี้ไปแล้วที่หมู่อื่น (ไม่ได้เพิ่มซ้ำให้):</label>
                <textarea
                  readOnly
                  value={uploadResult.already_in_other_section
                    .map((c) => `${c.student_id} (หมู่ ${c.section})`)
                    .join(", ")}
                  onClick={(e) => e.target.select()}
                />
              </div>
            )}
          </div>
        )}
      </div>
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

  // --- สร้าง CLO + ผูกกับ PLO (ขั้นตอนเดียวกัน) ---
  const [cloCode, setCloCode] = useState("");
  const [cloDescription, setCloDescription] = useState("");
  const [cloThreshold, setCloThreshold] = useState("60");
  const [cloFormError, setCloFormError] = useState("");
  const [plos, setPlos] = useState([]);
  const [cloPloMappings, setCloPloMappings] = useState([]);
  const [activeCloMapId, setActiveCloMapId] = useState(null);
  const [mapPloId, setMapPloId] = useState("");
  const [mapPloWeight, setMapPloWeight] = useState("");
  const [ploMapError, setPloMapError] = useState("");

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

  const ploById = useMemo(() => {
    const map = {};
    plos.forEach((p) => (map[p.id] = p));
    return map;
  }, [plos]);

  useEffect(() => {
    if (!curriculumId) return;
    listPLO()
      .then((all) => setPlos(all.filter((p) => p.curriculum_id === curriculumId)))
      .catch(() => {});
  }, [curriculumId]);

  async function reloadCloPloMappings() {
    const all = await listCLOPLOMapping();
    const cloIds = new Set(courseCLOs.map((c) => c.id));
    setCloPloMappings(all.filter((m) => cloIds.has(m.clo_id)));
  }

  useEffect(() => {
    if (courseCLOs.length === 0) {
      setCloPloMappings([]);
      return;
    }
    reloadCloPloMappings().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseCLOs]);

  async function handleCreateCLO(e) {
    e.preventDefault();
    setCloFormError("");
    if (!cloCode.trim() || !cloDescription.trim()) return;
    try {
      const created = await createCLO({
        course_id: courseId,
        code: cloCode.trim(),
        description: cloDescription.trim(),
        pass_threshold_percent: Number(cloThreshold || 60),
      });
      setCloCode("");
      setCloDescription("");
      setCloThreshold("60");
      await onCLOChanged();
      setActiveCloMapId(created.id); // สร้างเสร็จ เปิดฟอร์มผูก PLO ให้ทันที ไม่ต้องไปหาที่อื่น
    } catch (err) {
      setCloFormError(err?.response?.data?.detail || "สร้าง CLO ไม่สำเร็จ (รหัส CLO นี้อาจมีอยู่แล้วในวิชานี้)");
    }
  }

  async function handleDeleteCLO(id) {
    if (
      !window.confirm(
        "ยืนยันการลบ CLO นี้? การลบจะลบการผูกกับ PLO และการผูกกับงานประเมินที่มีอยู่ทั้งหมดของ CLO นี้ไปด้วย"
      )
    )
      return;
    try {
      await deleteCLO(id);
      await onCLOChanged();
    } catch (err) {
      setCloFormError(err?.response?.data?.detail || "ลบ CLO ไม่สำเร็จ");
    }
  }

  async function handleAddPloMapping(e, cloId) {
    e.preventDefault();
    setPloMapError("");
    if (!mapPloId || mapPloWeight === "") return;
    try {
      await createCLOPLOMapping({
        clo_id: cloId,
        plo_id: Number(mapPloId),
        weight_percent: Number(mapPloWeight),
      });
      setMapPloId("");
      setMapPloWeight("");
      await reloadCloPloMappings();
    } catch (err) {
      setPloMapError(err?.response?.data?.detail || "ผูกกับ PLO นี้ไม่สำเร็จ (อาจผูกไว้อยู่แล้ว)");
    }
  }

  async function handleDeletePloMapping(id) {
    if (!window.confirm("ยืนยันการเลิกผูก PLO นี้?")) return;
    try {
      await deleteCLOPLOMapping(id);
      await reloadCloPloMappings();
    } catch {
      setPloMapError("เลิกผูกไม่สำเร็จ");
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
          สร้าง CLO ของวิชาก่อน (จะมีกี่ข้อก็ได้) แล้วเลือกว่าแต่ละข้อไปสนับสนุน PLO ข้อไหนบ้าง พร้อม
          กำหนดน้ำหนัก % — ผูกได้หลาย PLO ต่อ 1 CLO จากนั้นค่อยไปสร้างงานประเมินผูกกับ CLO ในหัวข้อถัดไป
        </p>
        {cloFormError && <p className="error-message">{cloFormError}</p>}

        <table className="student-table">
          <thead>
            <tr>
              <th>รหัส CLO</th>
              <th>คำอธิบาย</th>
              <th>เกณฑ์ผ่าน (%)</th>
              <th>ผูกกับ PLO แล้ว</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courseCLOs.map((clo) => {
              const links = cloPloMappings.filter((m) => m.clo_id === clo.id);
              const isMapping = activeCloMapId === clo.id;
              return (
                <Fragment key={clo.id}>
                  <tr className="student-table-row">
                    <td className="student-table-cell">{clo.code}</td>
                    <td className="student-table-cell">{clo.description}</td>
                    <td className="student-table-cell">{clo.pass_threshold_percent}</td>
                    <td className="student-table-cell">
                      {links.length === 0 ? (
                        <span className="workspace-muted">ยังไม่ได้ผูกกับ PLO ไหนเลย</span>
                      ) : (
                        <ul className="clo-trace-list">
                          {links.map((m) => (
                            <li key={m.id}>
                              <span className="clo-trace-item-name">
                                {ploById[m.plo_id]?.code ?? `PLO #${m.plo_id}`}
                              </span>
                              <span className="clo-trace-item-weight">{m.weight_percent}%</span>
                              <button
                                type="button"
                                className="icon-btn-delete"
                                title="เลิกผูก PLO นี้"
                                onClick={() => handleDeletePloMapping(m.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPloMapError("");
                          setActiveCloMapId(isMapping ? null : clo.id);
                        }}
                      >
                        {isMapping ? "ปิดฟอร์มผูก PLO" : "+ ผูก PLO"}
                      </button>
                    </td>
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
                  {isMapping && (
                    <tr className="student-table-detail-row">
                      <td colSpan={5}>
                        {ploMapError && <p className="error-message">{ploMapError}</p>}
                        <form
                          onSubmit={(e) => handleAddPloMapping(e, clo.id)}
                          className="workspace-inline-form"
                        >
                          <div className="form-field">
                            <label htmlFor={`map-plo-${clo.id}`}>PLO</label>
                            <select
                              id={`map-plo-${clo.id}`}
                              value={mapPloId}
                              onChange={(e) => setMapPloId(e.target.value)}
                              required
                            >
                              <option value="" disabled>
                                เลือก PLO
                              </option>
                              {plos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} - {p.description}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-field">
                            <label htmlFor={`map-weight-${clo.id}`}>น้ำหนัก (%)</label>
                            <input
                              id={`map-weight-${clo.id}`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={mapPloWeight}
                              onChange={(e) => setMapPloWeight(e.target.value)}
                              required
                            />
                          </div>
                          <button type="submit">+ ผูกกับ PLO นี้</button>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {courseCLOs.length === 0 && (
          <p className="student-list-empty">วิชานี้ยังไม่มี CLO - สร้างข้อแรกด้านล่างได้เลย</p>
        )}

        <form onSubmit={handleCreateCLO} className="workspace-inline-form">
          <div className="form-field">
            <label htmlFor="new-clo-code">รหัส CLO (เช่น CLO1)</label>
            <input
              id="new-clo-code"
              type="text"
              value={cloCode}
              onChange={(e) => setCloCode(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="new-clo-desc">คำอธิบาย</label>
            <input
              id="new-clo-desc"
              type="text"
              value={cloDescription}
              onChange={(e) => setCloDescription(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="new-clo-threshold">เกณฑ์ผ่าน (%)</label>
            <input
              id="new-clo-threshold"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={cloThreshold}
              onChange={(e) => setCloThreshold(e.target.value)}
            />
          </div>
          <button type="submit">+ สร้าง CLO</button>
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

function ScoresTab({ assessmentItems, enrollments, studentById, offeringScores, onSaved }) {
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSummary, setSaveSummary] = useState("");
  const [savingKeys, setSavingKeys] = useState(() => new Set());
  const [savedFlashKeys, setSavedFlashKeys] = useState(() => new Set());

  const scoreByStudentItem = useMemo(() => {
    const map = {};
    offeringScores.forEach((s) => {
      map[`${s.student_id}_${s.item_id}`] = s;
    });
    return map;
  }, [offeringScores]);

  const roster = useMemo(() => {
    const list = enrollments
      .map((e) => studentById[e.student_id])
      .filter(Boolean)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
    );
  }, [enrollments, studentById, search]);

  function cellValue(studentId, itemId) {
    const key = `${studentId}_${itemId}`;
    if (dirty[key] !== undefined) return dirty[key].value;
    const existing = scoreByStudentItem[key];
    return existing ? String(existing.score_obtained) : "";
  }

  function handleCellChange(studentId, itemId, value) {
    const key = `${studentId}_${itemId}`;
    const existing = scoreByStudentItem[key];
    setDirty((prev) => ({
      ...prev,
      [key]: { studentId, itemId, value, scoreId: existing ? existing.id : null },
    }));
  }

  async function handleCellBlur(studentId, itemId) {
    const key = `${studentId}_${itemId}`;
    const entry = dirty[key];
    if (!entry || entry.value === "") return;
    setSavingKeys((prev) => new Set(prev).add(key));
    try {
      if (entry.scoreId) {
        await updateStudentScore(entry.scoreId, Number(entry.value));
      } else {
        await createStudentScore({
          item_id: entry.itemId,
          student_id: entry.studentId,
          score_obtained: Number(entry.value),
        });
      }
      setDirty((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSavedFlashKeys((prev) => new Set(prev).add(key));
      setTimeout(() => {
        setSavedFlashKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 1200);
      await onSaved();
    } catch {
      // ทิ้ง entry ไว้ใน dirty ต่อไป - ผู้ใช้แก้/กด "บันทึกทั้งหมด" ใหม่ได้
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleSaveAll() {
    setSaving(true);
    setSaveSummary("");
    const entries = Object.values(dirty).filter((d) => d.value !== "");
    const results = await Promise.allSettled(
      entries.map((d) =>
        d.scoreId
          ? updateStudentScore(d.scoreId, Number(d.value))
          : createStudentScore({
              item_id: d.itemId,
              student_id: d.studentId,
              score_obtained: Number(d.value),
            })
      )
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    setSaveSummary(`บันทึกสำเร็จ ${succeeded} รายการ${failed > 0 ? `, ไม่สำเร็จ ${failed} รายการ` : ""}`);
    setDirty({});
    setSaving(false);
    await onSaved();
  }

  const dirtyCount = Object.keys(dirty).length;

  return (
    <div className="workspace-section">
      <h2>กรอกคะแนน</h2>

      <div className="toolbar-search workspace-search-wrap">
        <Search size={16} />
        <input
          type="text"
          placeholder="ค้นหารหัส/ชื่อนักศึกษา..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="score-sheet-wrapper">
        <table className="score-sheet-table">
          <thead>
            <tr>
              <th className="score-sheet-student-cell">นักศึกษา</th>
              {assessmentItems.map((item) => (
                <th key={item.id}>
                  {item.name}
                  <br />/{item.total_score}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.map((student) => (
              <tr key={student.id}>
                <td className="score-sheet-student-cell">
                  {student.id} {student.first_name} {student.last_name}
                </td>
                {assessmentItems.map((item) => {
                  const key = `${student.id}_${item.id}`;
                  const inputClass = savedFlashKeys.has(key)
                    ? "score-input-saved"
                    : savingKeys.has(key)
                    ? "score-input-saving"
                    : "";
                  return (
                    <td key={item.id}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={item.total_score}
                        className={inputClass}
                        value={cellValue(student.id, item.id)}
                        onChange={(e) => handleCellChange(student.id, item.id, e.target.value)}
                        onBlur={() => handleCellBlur(student.id, item.id)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {roster.length === 0 && <p className="student-list-empty">ไม่พบนักศึกษาที่ตรงกับการค้นหา</p>}
      {assessmentItems.length === 0 && (
        <p className="student-list-empty">วิชานี้ยังไม่มีงานประเมิน - เพิ่มในแท็บ "โครงสร้างการประเมิน" ก่อน</p>
      )}

      <div className="workspace-inline-form">
        <button type="button" onClick={handleSaveAll} disabled={saving || dirtyCount === 0}>
          {saving ? "กำลังบันทึก..." : `บันทึกทั้งหมด${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
        </button>
        {saveSummary && <p className="success-message">{saveSummary}</p>}
      </div>
    </div>
  );
}

function CLOTab({ cloAchievement, itemCLOs, assessmentItems }) {
  const [expandedCloId, setExpandedCloId] = useState(null);

  const itemById = useMemo(() => {
    const map = {};
    assessmentItems.forEach((i) => (map[i.id] = i));
    return map;
  }, [assessmentItems]);

  if (!cloAchievement) return <p>กำลังโหลด...</p>;

  const { clo_achievements } = cloAchievement;

  if (clo_achievements.length === 0) {
    return (
      <div className="workspace-section">
        <p className="student-list-empty">วิชานี้ยังไม่มี CLO</p>
      </div>
    );
  }

  const allStudentRows = clo_achievements[0].student_scores.map((s) => ({
    student_id: s.student_id,
    student_name: s.student_name,
  }));

  return (
    <>
      <div className="workspace-section">
        <h2>สรุปผลบรรลุ CLO ระดับชั้นเรียน</h2>
        <p className="workspace-hint">คลิกแถว CLO เพื่อดูว่าดึงคะแนนมาจากชิ้นงานประเมินใดบ้าง</p>
        <table className="student-table">
          <thead>
            <tr>
              <th></th>
              <th>CLO</th>
              <th>รายละเอียด</th>
              <th>เกณฑ์ผ่าน (%)</th>
              <th>ผ่าน</th>
              <th>ไม่ผ่าน</th>
              <th>ร้อยละบรรลุ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clo_achievements.map((clo) => {
              const achieved = clo.achieved_rate_percent >= clo.pass_threshold_percent;
              const isExpanded = expandedCloId === clo.clo_id;
              const linkedItems = itemCLOs.filter((ic) => ic.clo_id === clo.clo_id);
              return (
                <Fragment key={clo.clo_id}>
                  <tr
                    className="student-table-row expandable"
                    onClick={() => setExpandedCloId(isExpanded ? null : clo.clo_id)}
                  >
                    <td className="student-table-cell">
                      {isExpanded ? (
                        <ChevronDown size={16} color="var(--color-purple-600)" />
                      ) : (
                        <ChevronRight size={16} color="var(--color-purple-600)" />
                      )}
                    </td>
                    <td className="student-table-cell">{clo.clo_code}</td>
                    <td className="student-table-cell">{clo.description}</td>
                    <td className="student-table-cell">{clo.pass_threshold_percent}</td>
                    <td className="student-table-cell">{clo.passed_count}</td>
                    <td className="student-table-cell">{clo.failed_count}</td>
                    <td className="student-table-cell">
                      {clo.achieved_rate_percent}%
                      {clo.students_without_data > 0 && (
                        <span className="workspace-muted">
                          (อีก {clo.students_without_data} คนยังไม่มีข้อมูล)
                        </span>
                      )}
                    </td>
                    <td className="student-table-cell">
                      <span className={achieved ? "badge-pass" : "badge-fail"}>
                        {achieved ? "บรรลุ" : "ยังไม่บรรลุ"}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="student-table-detail-row">
                      <td colSpan={8}>
                        {linkedItems.length === 0 ? (
                          <p className="student-list-empty">
                            CLO นี้ยังไม่ได้ผูกกับชิ้นงานประเมินใดเลย - ไปเพิ่มใน "โครงสร้างการประเมิน"
                          </p>
                        ) : (
                          <ul className="clo-trace-list">
                            {linkedItems.map((ic) => (
                              <li key={ic.id}>
                                <span className="clo-trace-item-name">
                                  {itemById[ic.item_id]?.name ?? `item #${ic.item_id}`}
                                </span>
                                <span className="clo-trace-item-weight">
                                  น้ำหนัก {ic.weight_percent}%
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="workspace-section">
        <h2>คะแนนรายบุคคลต่อ CLO</h2>
        <div className="score-sheet-wrapper">
          <table className="score-sheet-table">
            <thead>
              <tr>
                <th className="score-sheet-student-cell">นักศึกษา</th>
                {clo_achievements.map((clo) => (
                  <th key={clo.clo_id}>{clo.clo_code}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allStudentRows.map((row) => (
                <tr key={row.student_id}>
                  <td className="score-sheet-student-cell">
                    {row.student_id} {row.student_name}
                  </td>
                  {clo_achievements.map((clo) => {
                    const s = clo.student_scores.find((s) => s.student_id === row.student_id);
                    return (
                      <td key={clo.clo_id}>
                        {s ? (
                          <>
                            {s.clo_percent}%{" "}
                            <span className={s.passed ? "badge-pass" : "badge-fail"}>
                              {s.passed ? "ผ่าน" : "ไม่ผ่าน"}
                            </span>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
