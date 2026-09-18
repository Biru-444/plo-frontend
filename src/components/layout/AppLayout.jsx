/**
 * ทำอะไร : โครงหน้าหลักของแอป (sidebar + topbar + พื้นที่เนื้อหา) ห่อรอบทุก <Route> ใน App.jsx
 *
 * เชื่อมกับ : ถ้ายังไม่ login (ไม่มี token) จะไม่แสดง Sidebar/Topbar เลย คืนแค่ children ตรงๆ (ใช้กับ
 *             หน้า /login ที่ไม่ควรมีเมนูด้านข้าง)
 *
 * ถ้าแก้ : เนื้อหาจริงของแต่ละหน้า (children) render อยู่ใน <main className="app-content"> เสมอ
 */
import { useAuth } from "../../context/AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

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
