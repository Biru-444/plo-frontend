import { Link } from "react-router-dom";

const GROUPS = [
  {
    title: "หลักสูตร / PLO / YLO",
    links: [
      { to: "/admin/curriculum", label: "หลักสูตร" },
      { to: "/admin/plo", label: "PLO" },
      { to: "/admin/ylo", label: "YLO" },
      { to: "/admin/ylo-plo-mapping", label: "YLO-PLO Mapping" },
    ],
  },
  {
    title: "รายวิชา / CLO",
    links: [
      { to: "/admin/course", label: "รายวิชา" },
      { to: "/admin/course-plo", label: "Course-PLO Mapping" },
      { to: "/admin/study-plan", label: "แผนการศึกษา" },
      { to: "/admin/clo", label: "CLO" },
      { to: "/admin/clo-plo-mapping", label: "CLO-PLO Mapping" },
    ],
  },
  {
    title: "การเปิดสอน / นักศึกษา / ลงทะเบียน",
    links: [
      { to: "/admin/course-offerings", label: "การเปิดสอนรายวิชา" },
      { to: "/admin/students", label: "นักศึกษา" },
      { to: "/admin/enrollments", label: "การลงทะเบียน" },
      { to: "/admin/assessment-items", label: "งานประเมิน" },
      { to: "/admin/item-clo", label: "Item-CLO Mapping" },
    ],
  },
  {
    title: "ผู้ใช้งาน",
    links: [{ to: "/admin/users", label: "ผู้ใช้งาน (Admin/Instructor)" }],
  },
];

export default function AdminHome() {
  return (
    <div className="page">
      <h1>จัดการระบบ</h1>
      <div className="admin-home-groups">
        {GROUPS.map((group) => (
          <div className="admin-home-group" key={group.title}>
            <h2>{group.title}</h2>
            <div className="admin-home-links">
              {group.links.map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
