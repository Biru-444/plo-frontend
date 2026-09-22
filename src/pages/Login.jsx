  /**
 * ทำอะไร : หน้าเข้าสู่ระบบ — ฟอร์ม username/password เพียงอย่างเดียว ไม่มีฟีเจอร์ "ลืมรหัสผ่าน" หรือ
 *          "สมัครสมาชิก" เอง (บัญชีสร้างโดย admin ผ่าน AdminUsers.jsx หรือ roster import เท่านั้น)
 *
 * เชื่อมกับ : เรียก login() จาก AuthContext.jsx (ซึ่งยิง POST /auth/login ต่ออีกที) สำเร็จแล้ว
 *             useNavigate() พาไปหน้าแรก "/" ทันที
 *
 * ถ้าแก้ : แยกข้อความ error ระหว่าง 401 (username/password ผิด) กับ error อื่นๆ (เช่น เครือข่ายมี
 *          ปัญหา, backend ล่ม) เพื่อไม่ให้ผู้ใช้เข้าใจผิดว่าตัวเองพิมพ์รหัสผ่านผิดทั้งที่จริงๆ ระบบมี
 *          ปัญหา
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // กำลังรอผลจาก backend อยู่หรือไม่ - ใช้ปิดปุ่ม submit กันกดซ้ำระหว่างรอ
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ส่งฟอร์ม login - ดัก 401 แยกจาก error อื่นๆ เพื่อแสดงข้อความที่ตรงประเด็นกว่า
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      if (err.response?.status === 401) {
        setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      } else {
        setError("เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page login-page">
      <h1>เข้าสู่ระบบ</h1>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-field">
          <label htmlFor="username">ชื่อผู้ใช้</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">รหัสผ่าน</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="error-message">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
