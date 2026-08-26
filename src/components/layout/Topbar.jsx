import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    setOpen(false);
    logout();
    navigate("/login");
  }

  if (!user) return null;

  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`;

  return (
    <header className="topbar">
      <div className="topbar-profile" ref={containerRef}>
        <button type="button" className="topbar-profile-trigger" onClick={() => setOpen((v) => !v)}>
          <span className="topbar-avatar">{initials}</span>
          <span className="topbar-username">
            {user.first_name} {user.last_name}
          </span>
          <span className="topbar-chevron">▾</span>
        </button>

        {open && (
          <div className="topbar-dropdown">
            <Link to="/profile" onClick={() => setOpen(false)}>
              ดูโปรไฟล์
            </Link>
            <button type="button" onClick={handleLogout}>
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
