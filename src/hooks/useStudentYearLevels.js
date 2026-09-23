import { useEffect, useState } from "react";
import { listStudents } from "../api/client.js";
import { effectiveYearLevel } from "../utils/studentFilters.js";

/**
 * map ของ student_id -> ชั้นปีปัจจุบัน (สำหรับเทียบ/กรอง) สำหรับตัวกรอง "ชั้นปีปัจจุบัน" ในหน้าภาพรวม
 * PLO/YLO - ข้อมูล achievement ที่หน้าพวกนั้นโหลดมาอยู่แล้ว (getCohortPLOAchievement/getYLOAchievement)
 * ไม่มี field ชั้นปีมาด้วย แต่มีอยู่แล้วใน endpoint ที่มีอยู่เดิม (GET /students) จึงแค่ fetch เพิ่มจุด
 * เดียวแล้ว cross-reference เอา ไม่ต้องเพิ่ม backend endpoint ใหม่ - คืน null ระหว่างโหลด
 *
 * ค่าที่เก็บผ่าน effectiveYearLevel() (cap ที่ 4 ถ้า beyond_curriculum) ไม่ใช่ current_year_level ดิบ
 * ให้ตรงกับตัวเลือกกรอง "ปี 4+" ที่มีแค่ 1-4 ให้เลือก
 */
export function useStudentYearLevels() {
  const [map, setMap] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listStudents()
      .then((students) => {
        if (cancelled) return;
        const next = {};
        students.forEach((s) => {
          next[s.id] = effectiveYearLevel(s);
        });
        setMap(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return map;
}
