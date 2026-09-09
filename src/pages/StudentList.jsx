import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowLeft, ChevronRight } from "lucide-react";
import { listStudents, listCurricula } from "../api/client.js";
import { SortSelect, YearLevelFilter } from "../components/StudentFilterControls.jsx";
import { ROSTER_SORT_OPTIONS } from "../utils/studentFilters.js";

// เรียงรายชื่อนักศึกษา - สอดคล้องกับ sortKey เดียวกับที่หน้าภาพรวม PLO/YLO ใช้ (ROSTER_SORT_OPTIONS:
// id/name/year) แค่ field ของ Student ดิบต่างจาก achievement row shape ที่ compareStudentRows ในหน้า
// นั้นๆ ใช้ (studentId/studentName/yearLevel) จึงเขียน comparator แยกของตัวเองที่นี่แทนการฝืนใช้ร่วมกัน
function compareRoster(a, b, sortKey) {
  switch (sortKey) {
    case "name":
      return `${a.first_name}${a.last_name}`.localeCompare(`${b.first_name}${b.last_name}`, "th");
    case "year":
      return a.current_year_level - b.current_year_level;
    case "id":
    default:
      return Number(a.id) - Number(b.id);
  }
}

const STATUS_BADGE_CLASS = {
  กำลังศึกษา: "status-active",
  ลาออก: "status-dropped",
  พักการเรียน: "status-suspended",
  จบการศึกษา: "status-graduated",
};

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [curricula, setCurricula] = useState([]);
  const [curriculumById, setCurriculumById] = useState({});
  const [query, setQuery] = useState("");
  const [curriculumSearchQuery, setCurriculumSearchQuery] = useState("");
  // 'curriculum' = การ์ดเลือกหลักสูตร (ด่านแรกเสมอ), 'roster' = แท็บรุ่น/หมู่ + ตารางนักศึกษา
  const [view, setView] = useState("curriculum");
  const [selectedCurriculumId, setSelectedCurriculumId] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState(null);
  // "all" = ดูทุกหมู่ในรุ่นนั้น, "__unspecified__" = เฉพาะคนที่ยังไม่มีข้อมูลหมู่, อื่นๆ = ค่า section ตรงตัว
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedYearLevel, setSelectedYearLevel] = useState(null);
  const [sortKey, setSortKey] = useState("id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function handleSelectCurriculum(curriculumId) {
    setSelectedCurriculumId(curriculumId);
    const cohortsInCurriculum = [
      ...new Set(students.filter((s) => s.curriculum_id === curriculumId).map((s) => s.cohort_year)),
    ].sort((a, b) => b - a);
    setSelectedCohort(cohortsInCurriculum.length > 0 ? cohortsInCurriculum[0] : null);
    setSelectedSection("all");
    setView("roster");
  }

  function handleBackToCurricula() {
    setView("curriculum");
    setSelectedCurriculumId(null);
    setSelectedCohort(null);
    setSelectedSection("all");
  }

  function handleSelectCohort(cohort) {
    setSelectedCohort(cohort);
    setSelectedSection("all");
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([listStudents(), listCurricula()])
      .then(([data, curriculaData]) => {
        if (cancelled) return;
        setStudents(data);
        setCurricula(curriculaData);
        const byId = {};
        curriculaData.forEach((c) => (byId[c.id] = c));
        setCurriculumById(byId);
      })
      .catch(() => {
        if (!cancelled) {
          setError("โหลดรายชื่อนักศึกษาไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง หรือแจ้งผู้ดูแลระบบ");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCurricula = useMemo(() => {
    const trimmed = curriculumSearchQuery.trim().toLowerCase();
    if (!trimmed) return curricula;
    return curricula.filter((c) => c.name.toLowerCase().includes(trimmed));
  }, [curricula, curriculumSearchQuery]);

  const studentCountByCurriculum = useMemo(() => {
    const counts = {};
    students.forEach((s) => {
      counts[s.curriculum_id] = (counts[s.curriculum_id] || 0) + 1;
    });
    return counts;
  }, [students]);

  const studentsInCurriculum = useMemo(
    () => students.filter((s) => s.curriculum_id === selectedCurriculumId),
    [students, selectedCurriculumId]
  );

  const cohortOptions = useMemo(
    // เรียงรุ่นล่าสุดไปเก่าสุด (มากไปน้อย) จาก cohort_year จริงที่มีอยู่ - ไม่ hardcode ลำดับ
    // เพื่อให้รุ่นใหม่ที่เพิ่มเข้ามาในอนาคตโผล่เป็นแท็บซ้ายสุดเองอัตโนมัติ
    () => [...new Set(studentsInCurriculum.map((s) => s.cohort_year))].sort((a, b) => b - a),
    [studentsInCurriculum]
  );

  const studentsInCohort = useMemo(
    () => studentsInCurriculum.filter((s) => selectedCohort === null || s.cohort_year === selectedCohort),
    [studentsInCurriculum, selectedCohort]
  );

  const sectionOptions = useMemo(
    () =>
      [...new Set(studentsInCohort.map((s) => s.section).filter((v) => v))].sort((a, b) =>
        a.localeCompare(b, "th", { numeric: true })
      ),
    [studentsInCohort]
  );

  const hasUnspecifiedSection = useMemo(
    () => studentsInCohort.some((s) => !s.section),
    [studentsInCohort]
  );

  // ตัวเลือกสถานะ derive จากข้อมูลจริงในรุ่นที่เลือกอยู่เท่านั้น (เหมือน sectionOptions ด้านบน) ไม่
  // hardcode ลำดับ/ชุดค่าคงที่ เผื่อมีสถานะอื่นเพิ่มเข้ามาในอนาคตโดยไม่ต้องแก้โค้ดหน้านี้
  const statusOptions = useMemo(
    () => [...new Set(studentsInCohort.map((s) => s.status).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "th")
    ),
    [studentsInCohort]
  );

  const filteredStudents = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return studentsInCohort.filter((student) => {
      if (sectionOptions.length > 0) {
        if (selectedSection === "__unspecified__") {
          if (student.section) return false;
        } else if (selectedSection !== "all" && student.section !== selectedSection) {
          return false;
        }
      }
      if (selectedStatus !== "all" && student.status !== selectedStatus) return false;
      if (selectedYearLevel !== null && student.current_year_level !== selectedYearLevel) return false;
      if (!trimmed) return true;
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      const curriculumName = (curriculumById[student.curriculum_id]?.name ?? "").toLowerCase();
      return (
        student.id.toLowerCase().includes(trimmed) ||
        fullName.includes(trimmed) ||
        curriculumName.includes(trimmed)
      );
    });
  }, [
    studentsInCohort,
    query,
    selectedSection,
    sectionOptions,
    selectedStatus,
    selectedYearLevel,
    curriculumById,
  ]);

  const sortedStudents = useMemo(
    () => [...filteredStudents].sort((a, b) => compareRoster(a, b, sortKey)),
    [filteredStudents, sortKey]
  );

  return (
    <div className="page">
      <h1>รายชื่อนักศึกษา</h1>

      {error && <p className="error-message">{error}</p>}
      {loading && <p className="loading-message">กำลังโหลดข้อมูล...</p>}

      {!loading && !error && (
        <>
          {view === "curriculum" &&
            (curricula.length === 0 ? (
              <p className="student-list-empty">ยังไม่มีหลักสูตรในระบบ</p>
            ) : (
              <>
                <div className="toolbar-search student-list-toolbar">
                  <Search size={16} />
                  <input
                    type="text"
                    value={curriculumSearchQuery}
                    onChange={(e) => setCurriculumSearchQuery(e.target.value)}
                    placeholder="ค้นหาหลักสูตร..."
                    aria-label="ค้นหาหลักสูตร"
                  />
                </div>

                {filteredCurricula.length === 0 ? (
                  <p className="student-list-empty">ไม่พบหลักสูตรที่ค้นหา</p>
                ) : (
                  <div className="curriculum-card-grid">
                    {filteredCurricula.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="curriculum-card"
                        onClick={() => handleSelectCurriculum(c.id)}
                      >
                        <span className="curriculum-card-badge">
                          {studentCountByCurriculum[c.id] ?? 0} คน
                        </span>
                        <h3>{c.name}</h3>
                        <p className="curriculum-card-meta">ปี {c.year}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ))}

          {view === "roster" && (
            <>
              <div className="drilldown-breadcrumb">
                <button type="button" className="drilldown-breadcrumb-link" onClick={handleBackToCurricula}>
                  <ArrowLeft size={14} strokeWidth={2} />
                  กลับไปเลือกหลักสูตร
                </button>
              </div>

              {cohortOptions.length === 0 ? (
                <p className="student-list-empty">หลักสูตรนี้ยังไม่มีนักศึกษา</p>
              ) : (
                <>
                  <div className="cohort-tabs">
                    {cohortOptions.map((cohort) => (
                      <button
                        key={cohort}
                        type="button"
                        className={`cohort-tab ${cohort === selectedCohort ? "selected" : ""}`}
                        onClick={() => handleSelectCohort(cohort)}
                      >
                        รุ่น {cohort}
                      </button>
                    ))}
                  </div>

                  {sectionOptions.length > 0 && (
                    <div className="cohort-tabs cohort-tabs-sub">
                      <button
                        type="button"
                        className={`cohort-tab cohort-tab-sub ${selectedSection === "all" ? "selected" : ""}`}
                        onClick={() => setSelectedSection("all")}
                      >
                        ทั้งหมด
                      </button>
                      {sectionOptions.map((section) => (
                        <button
                          key={section}
                          type="button"
                          className={`cohort-tab cohort-tab-sub ${
                            selectedSection === section ? "selected" : ""
                          }`}
                          onClick={() => setSelectedSection(section)}
                        >
                          หมู่ {section}
                        </button>
                      ))}
                      {hasUnspecifiedSection && (
                        <button
                          type="button"
                          className={`cohort-tab cohort-tab-sub ${
                            selectedSection === "__unspecified__" ? "selected" : ""
                          }`}
                          onClick={() => setSelectedSection("__unspecified__")}
                        >
                          ยังไม่ระบุหมู่
                        </button>
                      )}
                    </div>
                  )}

                  <div className="toolbar-search student-list-toolbar">
                    <Search size={16} />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="ค้นหาด้วยรหัส/ชื่อ-นามสกุล/หลักสูตร"
                      aria-label="ค้นหานักศึกษา"
                    />
                  </div>

                  <div className="student-filter-toolbar">
                    {statusOptions.length > 0 && (
                      <label className="plo-cohort-prefix-filter">
                        สถานะ
                        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                          <option value="all">ทั้งหมด</option>
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <YearLevelFilter
                      value={selectedYearLevel}
                      onChange={setSelectedYearLevel}
                      label="ชั้นปีที่เรียน"
                    />
                    <SortSelect value={sortKey} onChange={setSortKey} options={ROSTER_SORT_OPTIONS} />
                  </div>

                  <table className="student-table">
                    <thead>
                      <tr>
                        <th>รหัสนักศึกษา</th>
                        <th>คำนำหน้า+ชื่อ-นามสกุล</th>
                        <th>หลักสูตร</th>
                        <th>ปีที่เรียน</th>
                        <th>สถานะ</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudents.map((student) => (
                        <Link
                          key={student.id}
                          to={`/student-plo?student_id=${encodeURIComponent(student.id)}`}
                          className="student-table-row"
                        >
                          <span className="student-table-cell">{student.id}</span>
                          <span className="student-table-cell">
                            {student.title ? `${student.title} ` : ""}
                            {student.first_name} {student.last_name}
                          </span>
                          <span className="student-table-cell">
                            {curriculumById[student.curriculum_id]?.name ?? `#${student.curriculum_id}`}
                          </span>
                          <span className="student-table-cell">{`ปี ${student.current_year_level}`}</span>
                          <span className="student-table-cell">
                            <span className={`status-badge ${STATUS_BADGE_CLASS[student.status] ?? ""}`}>
                              {student.status}
                            </span>
                          </span>
                          <span className="student-table-cell student-row-arrow-cell">
                            <ChevronRight size={16} color="var(--color-purple-600)" />
                          </span>
                        </Link>
                      ))}
                    </tbody>
                  </table>

                  {sortedStudents.length === 0 && (
                    <p className="student-list-empty">ไม่พบนักศึกษาที่ตรงกับตัวกรองที่เลือก</p>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
