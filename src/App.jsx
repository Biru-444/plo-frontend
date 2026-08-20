import { Routes, Route, Link, useNavigate } from "react-router-dom";
import PLOAchievement from "./pages/PLOAchievement.jsx";
import StudentList from "./pages/StudentList.jsx";
import CurriculumCourses from "./pages/CurriculumCourses.jsx";
import PLODashboard from "./pages/PLODashboard.jsx";
import PLOYearProgress from "./pages/PLOYearProgress.jsx";
import Login from "./pages/Login.jsx";
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
import AdminCLOPLOMapping from "./pages/admin/AdminCLOPLOMapping.jsx";
import AdminAssessmentItem from "./pages/admin/AdminAssessmentItem.jsx";
import AdminItemCLO from "./pages/admin/AdminItemCLO.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminEnrollments from "./pages/admin/AdminEnrollments.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";

export default function App() {
  const { user, token, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">PLO Evaluation System</h1>
        <nav>
          {token ? (
            <>
              <Link to="/">ผลการบรรลุ PLO</Link>
              <Link to="/students">รายชื่อนักศึกษา</Link>
              <Link to="/curriculum">หลักสูตร/รายวิชา</Link>
              <Link to="/dashboard">ภาพรวม PLO</Link>
              <Link to="/plo-by-year">PLO ตามชั้นปี</Link>
              <Link to="/scores">จัดการคะแนน</Link>
              {isAdmin && <Link to="/admin">จัดการระบบ</Link>}
              <span className="nav-user">
                {user.first_name} {user.last_name}
                <span className={`badge-role ${user.role}`}>{user.role}</span>
              </span>
              <button type="button" className="nav-logout" onClick={handleLogout}>
                ออกจากระบบ
              </button>
            </>
          ) : (
            <Link to="/login">เข้าสู่ระบบ</Link>
          )}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <PLOAchievement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <StudentList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/curriculum"
            element={
              <ProtectedRoute>
                <CurriculumCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <PLODashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plo-by-year"
            element={
              <ProtectedRoute>
                <PLOYearProgress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scores"
            element={
              <ProtectedRoute>
                <ScoreManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute requireAdmin>
                <AddStudent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/curriculum"
            element={
              <ProtectedRoute requireAdmin>
                <AddCurriculum />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/plo"
            element={
              <ProtectedRoute requireAdmin>
                <AdminPLO />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ylo"
            element={
              <ProtectedRoute requireAdmin>
                <AdminYLO />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ylo-plo-mapping"
            element={
              <ProtectedRoute requireAdmin>
                <AdminYLOPLOMapping />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/course"
            element={
              <ProtectedRoute requireAdmin>
                <AdminCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/course-plo"
            element={
              <ProtectedRoute requireAdmin>
                <AdminCoursePLO />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/study-plan"
            element={
              <ProtectedRoute requireAdmin>
                <AdminStudyPlan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/course-offerings"
            element={
              <ProtectedRoute requireAdmin>
                <AdminCourseOffering />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clo"
            element={
              <ProtectedRoute requireAdmin>
                <AdminCLO />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clo-plo-mapping"
            element={
              <ProtectedRoute requireAdmin>
                <AdminCLOPLOMapping />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/assessment-items"
            element={
              <ProtectedRoute requireAdmin>
                <AdminAssessmentItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/item-clo"
            element={
              <ProtectedRoute requireAdmin>
                <AdminItemCLO />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireAdmin>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/enrollments"
            element={
              <ProtectedRoute requireAdmin>
                <AdminEnrollments />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
