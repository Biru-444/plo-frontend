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
import AdminCoursePLO from "./pages/admin/AdminCoursePLO.jsx";
import AdminStudyPlan from "./pages/admin/AdminStudyPlan.jsx";
import AdminCourseOffering from "./pages/admin/AdminCourseOffering.jsx";
import AdminCLO from "./pages/admin/AdminCLO.jsx";
import AdminAssessmentItem from "./pages/admin/AdminAssessmentItem.jsx";
import AdminItemCLO from "./pages/admin/AdminItemCLO.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminEnrollments from "./pages/admin/AdminEnrollments.jsx";
import AdminRosterImport from "./pages/admin/AdminRosterImport.jsx";
import CourseOfferingWorkspace from "./pages/admin/CourseOfferingWorkspace.jsx";
import AdminCourseGrading from "./pages/admin/AdminCourseGrading.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
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
      <Route
        path="/admin/course-plo"
        element={
          <AppLayout>
            <ProtectedRoute requireAdmin>
              <AdminCoursePLO />
            </ProtectedRoute>
          </AppLayout>
        }
      />
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
