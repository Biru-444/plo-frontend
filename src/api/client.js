import axios from "axios";

// Reads VITE_API_BASE_URL from .env (see .env.example). Falls back to the
// default local FastAPI dev server address.
const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Must match the key AuthContext uses to persist { user, token }.
export const AUTH_STORAGE_KEY = "plo_auth";

export const api = axios.create({
  baseURL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const token = raw ? JSON.parse(raw).token : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // malformed/missing storage - send the request unauthenticated
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

/**
 * Log in. Backend: POST /auth/login (OAuth2PasswordRequestForm - expects
 * application/x-www-form-urlencoded, not JSON).
 * Returns: { access_token, token_type, user: { id, username, first_name, last_name, role } }
 */
export async function login(username, password) {
  const params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);
  const { data } = await api.post("/auth/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

/**
 * Fetch PLO achievement for a single student.
 * Backend: GET /plo/achievement?student_id=...
 * Returns: { student_id, student_name, curriculum_id, plo_achievements: [...] }
 */
export async function getStudentPLOAchievement(studentId) {
  const { data } = await api.get("/plo/achievement", {
    params: { student_id: studentId },
  });
  return data;
}

/**
 * Fetch PLO achievement summary for an entire curriculum cohort.
 * Backend: GET /plo/achievement/cohort?curriculum_id=...&cohort_year=...
 * cohortYear is optional - omit (or pass a falsy value) to include every cohort.
 * Returns: { curriculum_id, curriculum_name, total_students, plo_summary: [...],
 *   available_cohort_years: [...] }
 */
export async function getCohortPLOAchievement(curriculumId, cohortYear) {
  const { data } = await api.get("/plo/achievement/cohort", {
    params: { curriculum_id: curriculumId, ...(cohortYear ? { cohort_year: cohortYear } : {}) },
  });
  return data;
}

/**
 * Fetch PLO achievement broken down by year_level (1-4), where each year only
 * counts scores from courses in that year's study_plan (not cumulative).
 * Backend: GET /plo/achievement/by-year?curriculum_id=...&cohort_year=...
 * cohortYear is optional - omit (or pass a falsy value) to include every cohort.
 * Returns: { curriculum_id, curriculum_name, years: [{ year_level, ylo_description,
 *   course_count, plo_summary: [...], students: [...] }], available_cohort_years: [...] }
 */
export async function getPLOAchievementByYear(curriculumId, cohortYear) {
  const { data } = await api.get("/plo/achievement/by-year", {
    params: { curriculum_id: curriculumId, ...(cohortYear ? { cohort_year: cohortYear } : {}) },
  });
  return data;
}

// --- Other endpoints exposed by the backend, ready for the next pages ---

export async function listCurricula() {
  const { data } = await api.get("/curricula");
  return data;
}

export async function getCurriculum(curriculumId) {
  const { data } = await api.get(`/curricula/${curriculumId}`);
  return data;
}

export async function createCurriculum(payload) {
  const { data } = await api.post("/curricula", payload);
  return data;
}

export async function updateCurriculum(id, payload) {
  const { data } = await api.put(`/curricula/${id}`, payload);
  return data;
}

export async function deleteCurriculum(id) {
  await api.delete(`/curricula/${id}`);
}

export async function listCourses() {
  const { data } = await api.get("/courses");
  return data;
}

export async function createCourse(payload) {
  const { data } = await api.post("/courses", payload);
  return data;
}

export async function updateCourse(id, payload) {
  const { data } = await api.put(`/courses/${id}`, payload);
  return data;
}

export async function deleteCourse(id) {
  await api.delete(`/courses/${id}`);
}

export async function listStudents() {
  const { data } = await api.get("/students");
  return data;
}

export async function getStudent(studentId) {
  const { data } = await api.get(`/students/${studentId}`);
  return data;
}

export async function createStudent(payload) {
  const { data } = await api.post("/students", payload);
  return data;
}

export async function updateStudent(id, payload) {
  const { data } = await api.put(`/students/${id}`, payload);
  return data;
}

export async function deleteStudent(id) {
  await api.delete(`/students/${id}`);
}

/**
 * วิชาที่ study_plan แนะนำสำหรับนักศึกษาคนนี้ (ตามชั้นปีที่เรียนมาแล้วจนถึงปัจจุบัน) ที่มี
 * course_offering จริงรองรับแล้วแต่ยังไม่ได้ลงทะเบียน - ใช้เป็นคำแนะนำในหน้าลงทะเบียนด้วยตนเอง
 * Backend: GET /students/{id}/recommended-offerings
 */
export async function getRecommendedOfferings(studentId) {
  const { data } = await api.get(`/students/${studentId}/recommended-offerings`);
  return data;
}

export async function listEnrollments(offeringId) {
  const { data } = await api.get("/enrollments", {
    params: offeringId ? { offering_id: offeringId } : {},
  });
  return data;
}

export async function listStudentEnrollments(studentId) {
  const { data } = await api.get("/enrollments", { params: { student_id: studentId } });
  return data;
}

export async function createEnrollment(payload) {
  const { data } = await api.post("/enrollments", payload);
  return data;
}

export async function updateEnrollment(id, payload) {
  const { data } = await api.put(`/enrollments/${id}`, payload);
  return data;
}

export async function deleteEnrollment(id) {
  await api.delete(`/enrollments/${id}`);
}

/**
 * Enroll every student in one cohort_year (matching the offering's curriculum)
 * into an offering at once. Backend: POST /enrollments/bulk-by-cohort
 * Returns: { added_count, already_enrolled_count, added_students: [{id, first_name, last_name}],
 *            already_in_other_section: [{student_id, section}] }
 */
export async function bulkEnrollByCohort(offeringId, cohortYear) {
  const { data } = await api.post("/enrollments/bulk-by-cohort", {
    offering_id: offeringId,
    cohort_year: cohortYear,
  });
  return data;
}

/**
 * Enroll a specific list of student IDs into an offering at once.
 * Backend: POST /enrollments/bulk
 * Returns: { added_count, already_enrolled: [...ids], not_found: [...ids], wrong_curriculum: [...ids],
 *            already_in_other_section: [{student_id, section}] }
 */
export async function bulkEnrollStudents(offeringId, studentIds) {
  const { data } = await api.post("/enrollments/bulk", {
    offering_id: offeringId,
    student_ids: studentIds,
  });
  return data;
}

/**
 * Upload a .csv/.xlsx roster file to enroll students into an offering.
 * Backend: POST /enrollments/bulk-upload (multipart/form-data)
 * Returns: same shape as bulkEnrollStudents.
 */
export async function bulkEnrollUpload(offeringId, file) {
  const formData = new FormData();
  formData.append("offering_id", offeringId);
  formData.append("file", file);
  const { data } = await api.post("/enrollments/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/**
 * Which of a course's students are already enrolled in a *different* offering
 * (section/หมู่) of the same course/term - used to keep multi-section courses
 * (e.g. รุ่น 69 split into หมู่ 1/หมู่ 2) from being lumped together.
 * Backend: GET /enrollments/sibling-sections?offering_id=...
 * Returns: [{ student_id, section }]
 */
export async function getSiblingSectionEnrollments(offeringId) {
  const { data } = await api.get("/enrollments/sibling-sections", {
    params: { offering_id: offeringId },
  });
  return data;
}

export async function listAssessmentItems(offeringId) {
  const { data } = await api.get("/assessment-items", {
    params: offeringId ? { offering_id: offeringId } : {},
  });
  return data;
}

export async function createAssessmentItem(payload) {
  const { data } = await api.post("/assessment-items", payload);
  return data;
}

export async function updateAssessmentItem(id, payload) {
  const { data } = await api.put(`/assessment-items/${id}`, payload);
  return data;
}

export async function deleteAssessmentItem(id) {
  await api.delete(`/assessment-items/${id}`);
}

// --- PLO ---

export async function listPLO() {
  const { data } = await api.get("/plo");
  return data;
}

// วิชาตามแผนหลักสูตร (มคอ.2, course_plo)
export async function getPLOCoursePlan(ploId) {
  const { data } = await api.get(`/plo/${ploId}/course-plan`);
  return data;
}

// วิชาที่เกี่ยวข้องกับ PLO ข้อนี้ พร้อมสถานะผ่าน/ไม่ผ่านของนักศึกษาคนนี้โดยเฉพาะต่อวิชา
export async function getStudentPLOCourseBreakdown(ploId, studentId) {
  const { data } = await api.get(`/plo/${ploId}/students/${studentId}/course-breakdown`);
  return data;
}

// นักศึกษาที่ลงทะเบียนวิชานี้จริง (ผ่าน enrollment) - คนละเรื่องกับ "ใครบรรลุ PLO"
// ploId (optional): เมื่อส่งมา แต่ละ item ใน response จะมี plo_achieved (true/false หรือ null) เพิ่ม
// มาด้วย - ผ่าน/ไม่ผ่านวิชานี้ของนักศึกษาคนนั้น เทียบกับ PLO ข้อนี้โดยเฉพาะ (all-or-nothing ต่อ CLO,
// คำนวณฝั่ง backend แบบ batch ทั้ง roster ไม่ query ทีละคน - ดู GET /courses/{id}/enrolled-students?plo_id=)
// null = ยังไม่มีข้อมูลให้ประเมิน (ไม่มี CLO ผูกกับ PLO นี้ในวิชานี้เลย หรือยังไม่มีคะแนนบันทึกเลย)
export async function getCourseEnrolledStudents(courseId, cohortYear, ploId) {
  const { data } = await api.get(`/courses/${courseId}/enrolled-students`, {
    params: {
      ...(cohortYear ? { cohort_year: cohortYear } : {}),
      ...(ploId ? { plo_id: ploId } : {}),
    },
  });
  return data;
}

export async function createPLO(payload) {
  const { data } = await api.post("/plo", payload);
  return data;
}

export async function updatePLO(id, payload) {
  const { data } = await api.put(`/plo/${id}`, payload);
  return data;
}

export async function deletePLO(id) {
  await api.delete(`/plo/${id}`);
}

// --- YLO ---

export async function listYLO(curriculumId) {
  const { data } = await api.get("/ylo", {
    params: curriculumId ? { curriculum_id: curriculumId } : {},
  });
  return data;
}

export async function getYLOAchievement(curriculumId, yearLevel, cohortYear) {
  const { data } = await api.get("/ylo/achievement/by-year", {
    params: {
      curriculum_id: curriculumId,
      year_level: yearLevel,
      ...(cohortYear ? { cohort_year: cohortYear } : {}),
    },
  });
  return data;
}

export async function createYLO(payload) {
  const { data } = await api.post("/ylo", payload);
  return data;
}

export async function updateYLO(id, payload) {
  const { data } = await api.put(`/ylo/${id}`, payload);
  return data;
}

export async function deleteYLO(id) {
  await api.delete(`/ylo/${id}`);
}

// --- YLO-PLO Mapping (GET/POST/DELETE only - no update endpoint) ---

export async function listYLOPLOMapping() {
  const { data } = await api.get("/ylo-plo-mapping");
  return data;
}

export async function createYLOPLOMapping(payload) {
  const { data } = await api.post("/ylo-plo-mapping", payload);
  return data;
}

export async function deleteYLOPLOMapping(id) {
  await api.delete(`/ylo-plo-mapping/${id}`);
}

// --- Course-PLO Mapping ---

export async function listCoursePLO() {
  const { data } = await api.get("/course-plo");
  return data;
}

export async function createCoursePLO(payload) {
  const { data } = await api.post("/course-plo", payload);
  return data;
}

export async function updateCoursePLO(id, payload) {
  const { data } = await api.put(`/course-plo/${id}`, payload);
  return data;
}

export async function deleteCoursePLO(id) {
  await api.delete(`/course-plo/${id}`);
}

// --- Study Plan ---

export async function listStudyPlan() {
  const { data } = await api.get("/study-plan");
  return data;
}

export async function createStudyPlan(payload) {
  const { data } = await api.post("/study-plan", payload);
  return data;
}

export async function updateStudyPlan(id, payload) {
  const { data } = await api.put(`/study-plan/${id}`, payload);
  return data;
}

export async function deleteStudyPlan(id) {
  await api.delete(`/study-plan/${id}`);
}

// --- Course Offerings ---

export async function listCourseOfferings(instructorId) {
  const { data } = await api.get("/course-offerings", {
    params: instructorId ? { instructor_id: instructorId } : {},
  });
  return data;
}

/**
 * วิชาที่เปิดสอนแต่ยังไม่มีผู้สอน (instructor_id ว่าง) - ให้อาจารย์เลือกจับจองเองได้
 * Backend: GET /course-offerings?unassigned=true
 */
export async function listUnassignedCourseOfferings() {
  const { data } = await api.get("/course-offerings", { params: { unassigned: true } });
  return data;
}

export async function createCourseOffering(payload) {
  const { data } = await api.post("/course-offerings", payload);
  return data;
}

export async function updateCourseOffering(id, payload) {
  const { data } = await api.put(`/course-offerings/${id}`, payload);
  return data;
}

export async function deleteCourseOffering(id) {
  await api.delete(`/course-offerings/${id}`);
}

/**
 * อาจารย์กดจับจองวิชาที่เปิดสอนแต่ยังไม่มีผู้สอน (ตัวเองเป็นผู้สอน) - ถ้ามีคนอื่นจับจองไปก่อนแล้ว
 * (แม้เสี้ยววินาทีก่อนหน้า) backend จะตอบ 409 กลับมา ให้รีเฟรชรายการแล้วลองวิชาอื่น
 * Backend: POST /course-offerings/{id}/claim
 */
export async function claimCourseOffering(offeringId) {
  const { data } = await api.post(`/course-offerings/${offeringId}/claim`);
  return data;
}

/**
 * อาจารย์ปล่อยคืนวิชาที่ตัวเองจับจองไว้ (กลับไปว่างให้คนอื่นจับจองต่อได้)
 * Backend: POST /course-offerings/{id}/release
 */
export async function releaseCourseOffering(offeringId) {
  const { data } = await api.post(`/course-offerings/${offeringId}/release`);
  return data;
}

// --- CLO ---

export async function listCLO() {
  const { data } = await api.get("/clo");
  return data;
}

export async function createCLO(payload) {
  const { data } = await api.post("/clo", payload);
  return data;
}

export async function updateCLO(id, payload) {
  const { data } = await api.put(`/clo/${id}`, payload);
  return data;
}

export async function deleteCLO(id) {
  await api.delete(`/clo/${id}`);
}

// --- Item-CLO Mapping ---

export async function listItemCLO() {
  const { data } = await api.get("/item-clo");
  return data;
}

export async function createItemCLO(payload) {
  const { data } = await api.post("/item-clo", payload);
  return data;
}

export async function updateItemCLO(id, payload) {
  const { data } = await api.put(`/item-clo/${id}`, payload);
  return data;
}

export async function deleteItemCLO(id) {
  await api.delete(`/item-clo/${id}`);
}

// --- Users (staff accounts) ---

export async function listUsers() {
  const { data } = await api.get("/users");
  return data;
}

export async function createUser(payload) {
  const { data } = await api.post("/users", payload);
  return data;
}

export async function updateUser(id, payload) {
  const { data } = await api.put(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id) {
  await api.delete(`/users/${id}`);
}

/**
 * Fetch every recorded score for one student, joined with assessment item name.
 * Backend: GET /student-scores?student_id=...
 */
export async function getStudentScores(studentId) {
  const { data } = await api.get("/student-scores", {
    params: { student_id: studentId },
  });
  return data;
}

export async function updateStudentScore(scoreId, scoreObtained) {
  const { data } = await api.put(`/student-scores/${scoreId}`, {
    score_obtained: scoreObtained,
  });
  return data;
}

export async function createStudentScore(payload) {
  const { data } = await api.post("/student-scores", payload);
  return data;
}

/**
 * Fetch every recorded score for every student enrolled in one course offering.
 * Backend: GET /student-scores?offering_id=...
 */
export async function getOfferingStudentScores(offeringId) {
  const { data } = await api.get("/student-scores", {
    params: { offering_id: offeringId },
  });
  return data;
}

/**
 * Fetch per-CLO class achievement for one course offering.
 * Backend: GET /clo-achievement?offering_id=...
 */
export async function getOfferingCLOAchievement(offeringId) {
  const { data } = await api.get("/clo-achievement", {
    params: { offering_id: offeringId },
  });
  return data;
}

// --- Roster Import (นำเข้ารายชื่อจากไฟล์ Excel ของมหาวิทยาลัย) ---

/**
 * นำเข้าไฟล์รายชื่อนักศึกษาที่มหาวิทยาลัยส่งให้อาจารย์ (.xls รูปแบบเก่า หรือ .xlsx) - อ่านวิชา/
 * ภาคเรียน/ผู้สอน/รายชื่อนักศึกษาจากไฟล์เอง จับคู่หรือสร้าง course_offering, บัญชีผู้สอน, นักศึกษา,
 * และการลงทะเบียนให้อัตโนมัติ Backend: POST /roster-import (multipart/form-data), admin เท่านั้น
 * เรียกด้วย dryRun=true ก่อนเพื่อดูตัวอย่างผลลัพธ์ (ไม่บันทึกจริง) แล้วเรียกซ้ำด้วย dryRun=false
 * ด้วยไฟล์เดิมเพื่อบันทึกจริง
 */
export async function importRoster(file, dryRun) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("dry_run", dryRun ? "true" : "false");
  const { data } = await api.post("/roster-import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
