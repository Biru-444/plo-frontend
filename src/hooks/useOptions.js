import { useEffect, useState } from "react";

/**
 * เรียก listFn() ครั้งเดียวตอน mount แล้วแปลงผลลัพธ์เป็น options ด้วย mapToOptions (data) => [...]
 * ใช้แทน pattern "useState([]) + useEffect ยิง list แล้ว map" ที่ซ้ำกันในหลายหน้า admin สำหรับสร้าง
 * ตัวเลือก dropdown (เช่น รายชื่อหลักสูตร/รายวิชา) - ไม่ refetch เมื่อ listFn/mapToOptions เปลี่ยน
 * (deps ว่างเจตนา เหมือนพฤติกรรมเดิมก่อนแยกเป็น hook)
 */
export default function useOptions(listFn, mapToOptions) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    listFn().then((data) => setOptions(mapToOptions(data)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return options;
}
