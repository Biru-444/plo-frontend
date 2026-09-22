import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import PLOAchievement from "./pages/PLOAchievement.jsx";
import InstructorHome from "./pages/InstructorHome.jsx";
import StudentList from "./pages/StudentList.jsx";
import CurriculumCourses from "./pages/CurriculumCourses.jsx";
import PLODashboard from "./pages/PLODashboard.jsx";
import PLODetailPage from "./pages/PLODetailPage.jsx";
import PLOCourseDetailPage from "./pages/PLOCourseDetailPage.jsx";
import StudentCourseCLOPage from "./pages/StudentCourseCLOPage.jsx";
import YLOYearProgress from "./pages/YLOYearProgress.jsx";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import ScoreManagement from "./pages/ScoreManagement.jsx";
import AddStudent from "./pages/admin/AddStudent.jsx";
import AddCurriculum from "./pages/admin/AddCurriculum.jsx";
import AdminHome from "./pages/admin/AdminHome.jsx";
import AdminPLO from "./pages/admin/AdminPLO.jsx";
import AdminYLO from "./pages/admin/AdminYLO.jsx";
import AdminYLOPLOMapping from "./pages/admin/AdminYLOPLOMapping.jsx";
import AdminCourse from "./pages/admin/AdminCourse.jsx";
import AdminCLOPLOMapping from "./pages/admin/AdminCLOPLOMapping.jsx";
import AdminStudyPlan from "./pages/admin/AdminStudyPlan.jsx";
import AdminCourseOffering from "./pages/admin/AdminCourseOffering.jsx";
import AdminCLO from "./pages/admin/AdminCLO.jsx";
import AdminAssessmentItem from "./pages/admin/AdminAssessmentItem.jsx";
import AdminItemCLO from "./pages/admin/AdminItemCLO.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminEnrollments from "./pages/admin/AdminEnrollments.jsx";
import AdminRosterImport from "./pages/admin/AdminRosterImport.jsx";
import AdminCourseImportMCO3 from "./pages/admin/AdminCourseImportMCO3.jsx";
import AdminCurriculumImportMCO2 from "./pages/admin/AdminCurriculumImportMCO2.jsx";
import CourseOfferingWorkspace from "./pages/admin/CourseOfferingWorkspace.jsx";
import AdminCourseGrading from "./pages/admin/AdminCourseGrading.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

/**
 * ทำอะไร : กำหนดเส้นทาง (route) ทั้งหมดของระบบ — จับคู่ path ใน URL กับหน้าที่จะแสดง
 *
 * เชื่อมกับ : ทุกหน้าถูกห่อด้วย <AppLayout> (แถบเมนู/หัวเว็บ) และ <ProtectedRoute> (บังคับ login
 *             ก่อนเข้าดู — ใส่ requireAdmin เพิ่มถ้าต้องเป็น admin เท่านั้น) ยกเว้น /login ที่ไม่ต้อง
 *             login มาก่อน
 *
 * ถ้าแก้ : ลืมห่อหน้าใหม่ด้วย <ProtectedRoute> = ใครก็เข้าดูหน้านั้นได้โดยไม่ต้อง login เลย path ที่
 *          ไม่ตรงกับ route ไหนเลยจะถูก redirect กลับ "/" เสมอ (route "*" ท้ายไฟล์)
 */
export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* เข้าสู่ระบบ — เข้าถึงได้โดยไม่ต้อง login (ทางเข้าเดียวสำหรับผู้ที่ยังไม่ login) */}
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <AppLayout>
            <ProtectedRoute>
              {/* หน้าหลัก: instructor เห็นวิชาที่ตัวเองสอน, admin เห็นภาพรวม PLO ทั้งหลักสูตร (ไม่ใช้
                  PLOAchievement เป็นหน้าแรกอีกต่อไป เพราะเป็นแค่ช่องค้นหาด้วยรหัสเปล่าๆ ไม่มีบริบท -
                  ทางเข้าจริงของ PLOAchievement คือคลิกชื่อนักศึกษาจากหน้ารายชื่อ ที่ /student-plo) */}
              {user?.role === "instructor" ? <InstructorHome /> : <PLODashboard />}
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* ผลบรรลุ PLO/YLO รายบุคคล — ทั้ง admin และ instructor เข้าได้ (ทางเข้าจริงคือคลิกชื่อ
          นักศึกษาจากหน้ารายชื่อ) */}
      <Route
        path="/student-plo"
        element={
          <AppLayout>
            <ProtectedRoute>
              <PLOAchievement />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* เจาะลึกระดับ CLO -> คะแนน ของนักศึกษา 1 คนในวิชาเดียว — admin และ instructor เข้าได้ */}
      <Route
        path="/student-clo"
        element={
          <AppLayout>
            <ProtectedRoute>
              <StudentCourseCLOPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* หน้าทะเบียนรายชื่อนักศึกษา (กรอง/ค้นหา/เรียงลำดับ) — admin และ instructor เข้าได้ */}
      <Route
        path="/students"
        element={
          <AppLayout>
            <ProtectedRoute>
              <StudentList />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* รายวิชาของหลักสูตร (ดูเฉยๆ ไม่แก้ไข) — admin และ instructor เข้าได้ */}
      <Route
        path="/curriculum"
        element={
          <AppLayout>
            <ProtectedRoute>
              <CurriculumCourses />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* ภาพรวม PLO ทั้งหลักสูตร (การ์ดสรุป + ลิงก์ไปแต่ละ PLO) — admin และ instructor เข้าได้
          (เป็นหน้าแรกของ admin หลัง login ด้วย ดูเงื่อนไขที่ route "/" ด้านบน) */}
      <Route
        path="/dashboard"
        element={
          <AppLayout>
            <ProtectedRoute>
              <PLODashboard />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* ภาพรวม PLO ข้อเดียว (รายชื่อนักศึกษา + ตัวกรอง + drill-down รายวิชา) — admin และ
          instructor เข้าได้ */}
      <Route
        path="/plo/overview/:ploId"
        element={
          <AppLayout>
            <ProtectedRoute>
              <PLODetailPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* รายละเอียดวิชาเดียวภายใต้ PLO ข้อหนึ่ง — admin และ instructor เข้าได้ */}
      <Route
        path="/plo/overview/:ploId/course/:courseId"
        element={
          <AppLayout>
            <ProtectedRoute>
              <PLOCourseDetailPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* ผลบรรลุ YLO แยกตามชั้นปี — admin และ instructor เข้าได้ */}
      <Route
        path="/ylo-by-year"
        element={
          <AppLayout>
            <ProtectedRoute>
              <YLOYearProgress />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* จัดการคะแนนนักศึกษา (กรอก/แก้คะแนนชิ้นงาน) — admin และ instructor เข้าได้ */}
      <Route
        path="/scores"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ScoreManagement />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* ข้อมูลบัญชีผู้ใช้ปัจจุบัน — admin และ instructor เข้าได้ */}
      <Route
        path="/profile"
        element={
          <AppLayout>
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* ศูนย์รวมเมนูจัดการระบบ (การ์ดลิงก์ไปทุกหน้า admin ด้านล่าง) — admin เท่านั้น */}
      <Route
        path="/admin"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminHome />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* เพิ่ม/จัดการนักศึกษา — admin เท่านั้น */}
      <Route
        path="/admin/students"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AddStudent />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* เพิ่ม/จัดการหลักสูตร — admin เท่านั้น */}
      <Route
        path="/admin/curriculum"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AddCurriculum />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* จัดการ PLO ของหลักสูตร — admin เท่านั้น */}
      <Route
        path="/admin/plo"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminPLO />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* จัดการ YLO ของหลักสูตร — admin เท่านั้น */}
      <Route
        path="/admin/ylo"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminYLO />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* จัดการ mapping YLO<->PLO — admin เท่านั้น */}
      <Route
        path="/admin/ylo-plo-mapping"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminYLOPLOMapping />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* จัดการรายวิชา — admin เท่านั้น */}
      <Route
        path="/admin/course"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminCourse />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* เชื่อมโยง CLO กับ PLO โดยตรง (แทนที่ /admin/course-plo เดิม - สถาปัตยกรรมคำนวณเปลี่ยนไปใช้
          clo_plo_mapping ระดับ CLO แล้ว ดู แผนการแก้ไขครั้งใหญ่-PLO-CLO.md Workstream 1 ข้อ 4) —
          admin เท่านั้น */}
      <Route
        path="/admin/clo-plo-mapping"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminCLOPLOMapping />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* จัดการแผนการศึกษา (วิชาไหนสอนชั้นปี/เทอมไหน) — admin เท่านั้น */}
      <Route
        path="/admin/study-plan"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminStudyPlan />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* จัดการการเปิดสอนวิชา (course offering) — admin เท่านั้น */}
      <Route
        path="/admin/course-offerings"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminCourseOffering />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* จัดการ CLO ของวิชา — admin เท่านั้น (instructor จัดการ CLO ของวิชาตัวเองผ่านช่องทางอื่น
          ไม่ใช่หน้านี้) */}
      <Route
        path="/admin/clo"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminCLO />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* จัดการชิ้นงาน/ข้อสอบ (assessment item) — admin เท่านั้น */}
      <Route
        path="/admin/assessment-items"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminAssessmentItem />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* จัดการ mapping ชิ้นงาน<->CLO พร้อมน้ำหนัก — admin เท่านั้น */}
      <Route
        path="/admin/item-clo"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminItemCLO />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* จัดการบัญชีผู้ใช้ระบบ (admin/instructor) — admin เท่านั้น */}
      <Route
        path="/admin/users"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminUsers />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* จัดการการลงทะเบียนเรียน (รวมลงทะเบียนแบบกลุ่ม) — admin เท่านั้น */}
      <Route
        path="/admin/enrollments"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminEnrollments />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* นำเข้าไฟล์รายชื่อจากมหาวิทยาลัย (.xls/.xlsx) — admin เท่านั้น */}
      <Route
        path="/admin/roster-import"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminRosterImport />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* นำเข้าข้อมูลวิชาจาก มคอ.3 ด้วย AI (Phase 1 แกะข้อมูล + Phase 2 บันทึกจริงในหน้าเดียว) — admin
          เท่านั้น เพราะเป็นงานเตรียมข้อมูลหลักสูตร/วิชาระดับระบบ */}
      <Route
        path="/admin/course-import-mco3"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminCourseImportMCO3 />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* นำเข้าหลักสูตร/PLO จาก มคอ.2 ด้วย AI (Workstream 2) — admin เท่านั้น ไม่ต้องเลือกหลักสูตร
          เป้าหมายล่วงหน้าเหมือน มคอ.3 เพราะเอกสาร มคอ.2 คือเอกสารนิยามหลักสูตรเอง */}
      <Route
        path="/admin/curriculum-import-mco2"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminCurriculumImportMCO2 />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* พื้นที่ทำงานรวมของ course offering เดียว (ชิ้นงาน+CLO+คะแนน ในหน้าเดียว) — admin และ
          instructor เข้าได้ (ไม่ต้อง admin ต่างจากหน้า admin/* อื่นๆ เพราะ instructor ใช้จัดการ
          วิชาที่ตัวเองสอนโดยตรง) */}
      <Route
        path="/course-workspace"
        element={
          <AppLayout>
            <ProtectedRoute>
              <CourseOfferingWorkspace />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* ให้เกรดรายวิชา (สรุปคะแนน/เกรดของทั้งห้อง) — admin เท่านั้น */}
      <Route
        path="/admin/course-grading"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminCourseGrading />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      {/* path ที่ไม่ตรงกับ route ไหนเลย (เช่น /plo-by-year เดิม ที่ถูกรวมเข้ากับ /dashboard แล้ว) ->
          พากลับหน้าแรกแทนที่จะปล่อยเป็นหน้าขาว - ProtectedRoute ของ "/" จะพาไป /login เองถ้ายังไม่ login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
