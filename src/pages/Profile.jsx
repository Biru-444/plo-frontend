import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`;

  return (
    <div className="page profile-page">
      <h1>โปรไฟล์</h1>

      <div className="profile-card">
        <div className="profile-card-header">
          <div className="profile-avatar-lg">{initials}</div>
          <p className="profile-name">
            {user.first_name} {user.last_name}
          </p>
          <span className={`badge-role ${user.role}`}>{user.role}</span>
        </div>

        <div className="profile-card-body">
          <div className="profile-field">
            <span className="profile-field-label">Username</span>
            <span className="profile-field-value">{user.username}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">อีเมล</span>
            <span className="profile-field-value">{user.email || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
