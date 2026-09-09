import { useEffect, useState } from "react";
import { listStudents } from "../api/client.js";

/**
 * map ของ student_id -> current_year_level สำหรับตัวกรอง "ชั้นปีปัจจุบัน" ในหน้าภาพรวม PLO/YLO -
 * ข้อมูล achievement ที่หน้าพวกนั้นโหลดมาอยู่แล้ว (getCohortPLOAchievement/getYLOAchievement) ไม่มี field
 * current_year_level มาด้วย แต่มีอยู่แล้วใน endpoint ที่มีอยู่เดิม (GET /students) จึงแค่ fetch เพิ่มจุด
 * เดียวแล้ว cross-reference เอา ไม่ต้องเพิ่ม backend endpoint ใหม่ - คืน null ระหว่างโหลด
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
          next[s.id] = s.current_year_level;
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
