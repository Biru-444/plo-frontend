/**
 * ทำอะไร : จุดเริ่มต้นของ frontend ทั้งระบบ — mount React app เข้า DOM element id="root" (ใน
 *          index.html) ห่อด้วย provider ที่ทั้งแอปต้องใช้ร่วมกัน
 *
 * เชื่อมกับ : BrowserRouter เปิดใช้ routing แบบ URL path (App.jsx อ่าน route จากตรงนี้) AuthProvider
 *             ห่อรอบนอกสุดของ App เพื่อให้ทุกหน้า (รวมถึง Login) เรียก useAuth() ได้
 *
 * ถ้าแก้ : ลำดับการห่อ provider มีผล — AuthProvider ต้องอยู่ "ใน" BrowserRouter (ไม่ใช่นอก) เพราะ
 *          Login.jsx เรียก useNavigate() หลัง login สำเร็จ ซึ่งต้องมี Router context อยู่แล้ว
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
