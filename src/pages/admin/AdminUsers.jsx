/**
 * ทำอะไร : หน้าจัดการบัญชีผู้ใช้ระบบ (admin/instructor) — config ตาราง+ฟอร์มให้ CrudManager
 *          รับผิดชอบ UI ทั้งหมด
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /users ผ่าน api/client.js — route มาจาก App.jsx เส้นทาง
 *             "/admin/users" (admin เท่านั้น) — backend เข้ารหัสรหัสผ่านให้เองก่อนบันทึก (ไม่เคยส่ง
 *             plain text ไปเก็บตรงๆ)
 *
 * ถ้าแก้ : field password ใช้ omitIfEmptyOnUpdate เพื่อให้ตอนแก้ไขผู้ใช้ ถ้าเว้นช่องรหัสผ่านว่างไว้ =
 *          ไม่ส่งไปเปลี่ยนรหัสผ่านเดิม (ไม่ใช่ตั้งรหัสผ่านเป็นค่าว่าง)
 */
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listUsers, createUser, updateUser, deleteUser } from "../../api/client.js";

const ROLE_OPTIONS = [
  { value: "admin", label: "admin" },
  { value: "instructor", label: "instructor" },
];

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
