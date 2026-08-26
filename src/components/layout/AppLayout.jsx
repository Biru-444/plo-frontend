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
