import CrudManager from "../../components/admin/CrudManager.jsx";
import { listUsers, createUser, updateUser, deleteUser } from "../../api/client.js";

const ROLE_OPTIONS = [
  { value: "admin", label: "admin" },
  { value: "instructor", label: "instructor" },
];

/**
 * จัดการตารางผู้ใช้งาน (admin/instructor) ผ่าน CrudManager - ช่องรหัสผ่านเว้นว่างตอนแก้ไขได้
 * (omitIfEmptyOnUpdate: true) หมายถึง "ไม่เปลี่ยนรหัสผ่านเดิม" ไม่ใช่ตั้งเป็นค่าว่าง
 */
export default function AdminUsers() {
  const columns = [
    { key: "username", label: "Username", type: "text", required: true },
    {
      key: "password",
      label: "รหัสผ่าน (เว้นว่างถ้าไม่เปลี่ยน)",
      type: "password",
      required: true,
      nullable: true,
      omitIfEmptyOnUpdate: true,
    },
    { key: "first_name", label: "ชื่อ", type: "text", required: true },
    { key: "last_name", label: "นามสกุล", type: "text", required: true },
    { key: "email", label: "อีเมล", type: "text", nullable: true },
    { key: "role", label: "บทบาท", type: "select", options: ROLE_OPTIONS, required: true },
  ];

  return (
    <CrudManager
      title="จัดการผู้ใช้งาน (Admin/Instructor)"
      columns={columns}
      api={{ list: listUsers, create: createUser, update: updateUser, remove: deleteUser }}
    />
  );
}
