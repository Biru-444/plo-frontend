import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import QuickFormModal from "../components/QuickFormModal.jsx";
import {
  listCourses,
  listCurricula,
  createCurriculum,
  updateCurriculum,
  createCourse,
  updateCourse,
} from "../api/client.js";

const CURRICULUM_FIELDS = [
  { key: "name", label: "ชื่อหลักสูตร", type: "text", required: true },
  { key: "year", label: "ปีหลักสูตร", type: "number", required: true },
  {
    key: "is_active",
    label: "สถานะ",
    type: "select",
    options: [
      { value: "true", label: "ใช้งานอยู่" },
      { value: "false", label: "ไม่ใช้งาน" },
    ],
    required: true,
  },
];

// ใช้ตอนไม่มีข้อมูลวิชาจริงในระบบเลยให้ derive มาจาก (ระบบว่างเปล่าจริงๆ) - อิงตาม มคอ.2 ทั่วไป
// ไม่ใช่ชุดค่าคงที่ตายตัวที่บังคับใช้เสมอ (ปกติ dropdown จะ derive จากข้อมูลจริงเป็นหลัก ดู
// categoryOptions ใน CurriculumCourses ด้านล่าง)
const FALLBACK_CATEGORY_OPTIONS = ["วิชาแกน", "วิชาบังคับ", "วิชาเลือก", "วิชาชีพ/สหกิจ"];
const OTHER_CATEGORY_VALUE = "__other__";

/**
 * ช่อง "หมวดหมู่" ของฟอร์มวิชา - dropdown จากค่าที่มีอยู่จริงในระบบ (options) + ตัวเลือก "อื่นๆ"
 * ท้ายลิสต์เสมอ เลือก "อื่นๆ" แล้วโผล่ช่องพิมพ์เพิ่มให้กรอกชื่อหมวดหมู่เอง - ค่าสุดท้ายที่ได้ยังเป็น
 * string ธรรมดาเก็บใน courseForm.category ตรงๆ เหมือนเดิมทุกประการ (ไม่มี field พิเศษเพิ่ม)
 *
 * ถ้าค่าเดิมตอนเปิดฟอร์มแก้ไขไม่ตรงกับตัวเลือกไหนในลิสต์เลย (ข้อมูลเก่าที่หลุด pattern) ให้เริ่มที่
 * โหมด "อื่นๆ" พร้อม prefill ค่าดิบเดิมในช่องพิมพ์ทันที ไม่ให้ดูเหมือนข้อมูลหายไป - เช็คตอน mount
 * ครั้งเดียวพอ เพราะ QuickFormModal unmount ทุกครั้งที่ปิด แล้ว mount ใหม่ทุกครั้งที่เปิด (ค่าเริ่มต้น
 * จึงไม่มีทางค้างข้ามรอบเปิด-ปิด)
 */
function CourseCategoryField({ value, onChange, options }) {
  const [isOther, setIsOther] = useState(() => value !== "" && !options.includes(value));

  function handleSelectChange(e) {
    const selected = e.target.value;
    if (selected === OTHER_CATEGORY_VALUE) {
      setIsOther(true);
      onChange(""); // เคลียร์ค่าเดิม (ที่ตรงกับตัวเลือกก่อนหน้า) กันค้างไว้เงียบๆ จนกว่าจะพิมพ์ใหม่
    } else {
      setIsOther(false);
      onChange(selected);
    }
  }

  return (
    <>
      <select value={isOther ? OTHER_CATEGORY_VALUE : value} onChange={handleSelectChange}>
        <option value="">-- ไม่ระบุ --</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={OTHER_CATEGORY_VALUE}>อื่นๆ</option>
      </select>
      {isOther && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="พิมพ์ชื่อหมวดหมู่"
          required
        />
      )}
    </>
  );
}

function getCourseFields(categoryOptions) {
  return [
    { key: "course_code", label: "รหัสวิชา", type: "text", required: true },
    { key: "name_th", label: "ชื่อวิชา (ไทย)", type: "text", required: true },
    { key: "name_en", label: "ชื่อวิชา (อังกฤษ)", type: "text" },
    { key: "credit", label: "หน่วยกิต", type: "number", required: true },
    {
      key: "category",
      label: "หมวดหมู่",
      type: "custom",
      render: (value, onChange) => (
        <CourseCategoryField value={value} onChange={onChange} options={categoryOptions} />
      ),
    },
  ];
}

export default function CurriculumCourses() {
  const { isAdmin } = useAuth();
  const [curricula, setCurricula] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal เพิ่ม/แก้ไขหลักสูตร - เฉพาะ admin (ดู isAdmin ด้านบน)
  const [curriculumModal, setCurriculumModal] = useState(null); // null | { mode: "new" } | { mode: "edit", curriculum }
  const [curriculumForm, setCurriculumForm] = useState({});
  const [curriculumSaving, setCurriculumSaving] = useState(false);
  const [curriculumFormError, setCurriculumFormError] = useState("");

  // Modal เพิ่ม/แก้ไขรายวิชา - ผูกกับหลักสูตรที่เลือกอยู่เสมอ
  const [courseModal, setCourseModal] = useState(null); // null | { mode: "new" } | { mode: "edit", course }
  const [courseForm, setCourseForm] = useState({});
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseFormError, setCourseFormError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([listCurricula(), listCourses()])
      .then(([curriculaData, coursesData]) => {
        if (cancelled) return;
        setCurricula(curriculaData);
        setCourses(coursesData);
        if (curriculaData.length > 0) {
          setSelectedCurriculumId(curriculaData[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("ดึงข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const coursesForSelectedCurriculum = useMemo(
    () => courses.filter((course) => course.curriculum_id === selectedCurriculumId),
    [courses, selectedCurriculumId]
  );

  const filteredCourses = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return coursesForSelectedCurriculum;
    return coursesForSelectedCurriculum.filter((course) => {
      const nameEn = (course.name_en ?? "").toLowerCase();
      return (
        course.course_code.toLowerCase().includes(trimmed) ||
        course.name_th.toLowerCase().includes(trimmed) ||
        nameEn.includes(trimmed)
      );
    });
  }, [coursesForSelectedCurriculum, query]);

  // หมวดหมู่ที่มีอยู่จริงในระบบ (ทุกหลักสูตร ไม่ใช่แค่หลักสูตรที่เลือกอยู่ - วิชาข้ามหลักสูตรอาจใช้
  // หมวดหมู่ชื่อเดียวกันได้) เรียงตามตัวอักษรไทย - ใช้ FALLBACK_CATEGORY_OPTIONS เฉพาะตอนไม่มีข้อมูล
  // วิชาที่มี category จริงเลยสักตัวในระบบ
  const categoryOptions = useMemo(() => {
    const set = new Set();
    courses.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    const fromData = Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
    return fromData.length > 0 ? fromData : FALLBACK_CATEGORY_OPTIONS;
  }, [courses]);

  const courseFields = useMemo(() => getCourseFields(categoryOptions), [categoryOptions]);

  // --- หลักสูตร: เพิ่ม/แก้ไข ---

  function openAddCurriculum() {
    setCurriculumForm({ name: "", year: "", is_active: "true" });
    setCurriculumFormError("");
    setCurriculumModal({ mode: "new" });
  }

  function openEditCurriculum(curriculum) {
    setCurriculumForm({
      name: curriculum.name,
      year: curriculum.year,
      is_active: curriculum.is_active ? "true" : "false",
    });
    setCurriculumFormError("");
    setCurriculumModal({ mode: "edit", curriculum });
  }

  function handleCurriculumFieldChange(key, value) {
    setCurriculumForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCurriculumSubmit(e) {
    e.preventDefault();
    setCurriculumSaving(true);
    setCurriculumFormError("");
    try {
      const payload = {
        name: curriculumForm.name,
        year: Number(curriculumForm.year),
        is_active: curriculumForm.is_active === "true",
      };
      if (curriculumModal.mode === "new") {
        const created = await createCurriculum(payload);
        setCurricula((prev) => [...prev, created]);
        setSelectedCurriculumId(created.id);
      } else {
        const updated = await updateCurriculum(curriculumModal.curriculum.id, payload);
        setCurricula((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
      setCurriculumModal(null);
    } catch {
      setCurriculumFormError("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
    } finally {
      setCurriculumSaving(false);
    }
  }

  // --- รายวิชา: เพิ่ม/แก้ไข ---

  function openAddCourse() {
    setCourseForm({ course_code: "", name_th: "", name_en: "", credit: "", category: "" });
    setCourseFormError("");
    setCourseModal({ mode: "new" });
  }

  function openEditCourse(course) {
    setCourseForm({
      course_code: course.course_code,
      name_th: course.name_th,
      name_en: course.name_en ?? "",
      credit: course.credit,
      category: course.category ?? "",
    });
    setCourseFormError("");
    setCourseModal({ mode: "edit", course });
  }

  function handleCourseFieldChange(key, value) {
    setCourseForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCourseSubmit(e) {
    e.preventDefault();
    setCourseSaving(true);
    setCourseFormError("");
    try {
      const payload = {
        course_code: courseForm.course_code,
        name_th: courseForm.name_th,
        name_en: courseForm.name_en || null,
        credit: Number(courseForm.credit),
        category: courseForm.category || null,
      };
      if (courseModal.mode === "new") {
        const created = await createCourse({ ...payload, curriculum_id: selectedCurriculumId });
        setCourses((prev) => [...prev, created]);
      } else {
        const updated = await updateCourse(courseModal.course.id, payload);
        setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
      setCourseModal(null);
    } catch (err) {
      if (err?.response?.status === 409) {
        setCourseFormError("มีรหัสวิชานี้อยู่ในหลักสูตรนี้แล้ว กรุณาใช้รหัสอื่น");
      } else {
        setCourseFormError("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
      }
    } finally {
      setCourseSaving(false);
    }
  }

  return (
    <div className="page">
      <h1>หลักสูตร/รายวิชา</h1>

      {error && <p className="error-message">{error}</p>}

      {loading && <p className="loading-message">กำลังโหลดข้อมูล...</p>}

      {!loading && !error && (
        <div className="curriculum-layout">
          <aside className="curriculum-sidebar">
            {isAdmin && (
              <button type="button" onClick={openAddCurriculum}>
                + เพิ่มหลักสูตร
              </button>
            )}

            {curricula.map((curriculum) => (
              <div key={curriculum.id} className="curriculum-item-row">
                <button
                  type="button"
                  className={`curriculum-item ${
                    curriculum.id === selectedCurriculumId ? "selected" : ""
                  }`}
                  onClick={() => setSelectedCurriculumId(curriculum.id)}
                >
                  <span className="curriculum-item-name">{curriculum.name}</span>
                  <span className="curriculum-item-year">ปีการศึกษา {curriculum.year}</span>
                  <span
                    className={`curriculum-badge ${
                      curriculum.is_active ? "active" : "inactive"
                    }`}
                  >
                    {curriculum.is_active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                  </span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="icon-btn-edit"
                    title="แก้ไขหลักสูตร"
                    onClick={() => openEditCurriculum(curriculum)}
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            ))}
          </aside>

          <div className="curriculum-courses">
            <div className="curriculum-course-toolbar">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาด้วยรหัสวิชาหรือชื่อวิชา"
                aria-label="ค้นหารายวิชา"
              />
              {isAdmin && selectedCurriculumId && (
                <button type="button" onClick={openAddCourse}>
                  + เพิ่มวิชา
                </button>
              )}
            </div>

            <table className="student-table">
              <thead>
                <tr>
                  <th>รหัสวิชา</th>
                  <th>ชื่อวิชา (ไทย)</th>
                  <th>ชื่อวิชา (อังกฤษ)</th>
                  <th>หน่วยกิต</th>
                  <th>หมวดหมู่</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="student-table-row">
                    <td className="student-table-cell">{course.course_code}</td>
                    <td className="student-table-cell">{course.name_th}</td>
                    <td className="student-table-cell">{course.name_en ?? "-"}</td>
                    <td className="student-table-cell">{course.credit}</td>
                    <td className="student-table-cell">{course.category ?? "-"}</td>
                    {isAdmin && (
                      <td className="student-table-cell">
                        <button
                          type="button"
                          className="icon-btn-edit"
                          title="แก้ไขวิชา"
                          onClick={() => openEditCourse(course)}
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCourses.length === 0 && (
              <p className="student-list-empty">ไม่พบรายวิชาที่ตรงกับคำค้นหา</p>
            )}
          </div>
        </div>
      )}

      {curriculumModal && (
        <QuickFormModal
          title={curriculumModal.mode === "new" ? "เพิ่มหลักสูตร" : "แก้ไขหลักสูตร"}
          fields={CURRICULUM_FIELDS}
          values={curriculumForm}
          onChange={handleCurriculumFieldChange}
          onSubmit={handleCurriculumSubmit}
          onClose={() => setCurriculumModal(null)}
          saving={curriculumSaving}
          error={curriculumFormError}
        />
      )}

      {courseModal && (
        <QuickFormModal
          title={courseModal.mode === "new" ? "เพิ่มวิชา" : "แก้ไขวิชา"}
          fields={courseFields}
          values={courseForm}
          onChange={handleCourseFieldChange}
          onSubmit={handleCourseSubmit}
          onClose={() => setCourseModal(null)}
          saving={courseSaving}
          error={courseFormError}
        />
      )}
    </div>
  );
}
