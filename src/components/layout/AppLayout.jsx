import { useAuth } from "../../context/AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

/**
 * โครงหน้าหลักของแอป (sidebar ซ้าย + topbar บน + เนื้อหาหน้า) - ครอบทุก route ผ่าน App.jsx
 * ถ้ายังไม่ได้ล็อกอิน (ไม่มี token) จะไม่แสดง sidebar/topbar เลย ปล่อยให้ children (เช่นหน้า Login)
 * แสดงเต็มจอแทน
 */
export default function AppLayout({ children }) {
  const { token } = useAuth();

  if (!token) {
    return children;
  }

  return (
    <>
      <Sidebar />
      <div className="app-layout-body">
        <Topbar />
        <main className="app-content">{children}</main>
      </div>
    </>
  );
}
