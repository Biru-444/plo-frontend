# สถาปัตยกรรมของ plo-frontend (ภาษาไทย)

เอกสารนี้อธิบายภาพรวมโครงสร้างของ frontend (React + Vite) สำหรับระบบประเมินผลลัพธ์การเรียนรู้ระดับ
หลักสูตร (PLO Evaluation System) ให้คนที่ไม่เคยเห็นโค้ดมาก่อนเข้าใจได้ว่าระบบทำงานอย่างไร เขียนขึ้นหลัง
งาน "จัดระเบียบโครงสร้างโฟลเดอร์" (เฟส 1) และ "เพิ่มคอมเมนต์ภาษาไทย" (เฟส 2) เสร็จแล้ว จึงสะท้อน
โครงสร้างโฟลเดอร์ล่าสุด ไม่ใช่โครงสร้างก่อนหน้า

## ภาพรวมระบบ

ระบบนี้ช่วยคำนวณและแสดงผลว่านักศึกษา (รายบุคคล/ทั้งรุ่น/ทั้งหลักสูตร) "บรรลุ" ผลลัพธ์การเรียนรู้แต่ละ
ระดับหรือไม่ ตามแนวทาง Outcome-Based Education (OBE) มี backend แยกต่างหาก (FastAPI, repo
`plo-evaluation`) ที่ frontend นี้เรียกใช้ผ่าน REST API ทั้งหมด — frontend ไม่มี business logic คำนวณ
ผลบรรลุเอง แค่เรียก API แล้วแสดงผล/จัดการข้อมูลดิบ

โครงสร้างข้อมูลหลัก (chain):

```
Curriculum (หลักสูตร)
   → PLO (ผลลัพธ์ระดับหลักสูตร)
   → YLO (ผลลัพธ์ระดับชั้นปี)
   → Course (รายวิชา) ←→ course_plo (ผูกวิชากับ PLO โดยตรง)
   → CLO (ผลลัพธ์ระดับรายวิชา)
   → Course Offering / Enrollment (การเปิดสอน/ลงทะเบียน)
   → Assessment Items (ชิ้นงาน/ข้อสอบ)
   → Student Scores (คะแนนที่นักศึกษาได้)
```

จุดสำคัญ: การผูก CLO กับ PLO แบบถ่วงน้ำหนัก (`clo_plo_mapping`) ถูกรื้อทิ้งไปแล้ว ปัจจุบันผูกที่ระดับ
**วิชา↔PLO** ผ่าน `course_plo` แทน (ทุก CLO ในวิชาเดียวกันนับเท่ากันหมด) — ถ้าเห็นโค้ด/คอมเมนต์ไหนพูดถึง
"ผูก CLO กับ PLO" ในหน้าเก่าๆ ให้เข้าใจว่าเป็นของที่ถูกรื้อไปแล้ว

## โครงสร้างโฟลเดอร์

```
src/
├── main.jsx                 จุดเริ่มต้นแอป (ReactDOM.render + BrowserRouter + AuthProvider)
├── App.jsx                  ตาราง route ทั้งหมด
├── index.css                CSS ไฟล์เดียวรวมทั้งระบบ (ไม่มี CSS module, ~3000 บรรทัด)
│
├── api/
│   └── client.js            จุดเดียวที่เรียก backend - axios instance + ฟังก์ชัน wrapper ทุก endpoint
│
├── context/
│   └── AuthContext.jsx      สถานะล็อกอิน (user/token) + login()/logout() ใช้ผ่าน useAuth()
│
├── hooks/
│   ├── useOptions.js            fetch list ตอน mount แล้ว map เป็น dropdown options (ใช้ในหน้า admin)
│   └── useStudentYearLevels.js  map student_id -> current_year_level (ใช้กรองตามชั้นปีในหน้า PLO/YLO)
│
├── utils/
│   └── studentFilters.js    ตรรกะกรอง/เรียงนักศึกษาที่ใช้ร่วมกันหลายหน้า (ภาพรวม PLO, YLO ตามชั้นปี,
│                             รายชื่อนักศึกษา)
│
├── components/               component ใช้ร่วมกันหลายหน้า (ไม่ใช่ route โดยตรง)
│   ├── ProtectedRoute.jsx           ครอบ route ที่ต้องล็อกอิน (+ requireAdmin)
│   ├── SearchableSelect.jsx         combobox พิมพ์ค้นหาได้ (แทน <select> ตอนตัวเลือกเยอะ)
│   ├── QuickFormModal.jsx           modal ฟอร์มเพิ่ม/แก้ไขสั้นๆ ทั่วไป
│   ├── StudentFilterControls.jsx    ชิ้นส่วน UI ตัวกรอง/เรียงนักศึกษา (ค้นหา/สถานะ/% /ชั้นปี/เรียงลำดับ)
│   ├── StudentProfileCard.jsx       การ์ดสรุปข้อมูลนักศึกษาคนหนึ่ง
│   ├── PLODonut.jsx                 วงกลมแสดง % (SVG donut chart) - ใช้ซ้ำทั่วระบบ
│   ├── PLOSummaryCard.jsx / PLOSummaryStats.jsx / PLOChipGrid.jsx / PLOCohortBar.jsx
│   │                                 ชิ้นส่วนแสดงผล PLO ระดับต่างๆ (การ์ด/แถบสรุป/ชิป/แถบกลุ่ม)
│   ├── PLOCourseBreakdown.jsx       รายวิชาตามแผนหลักสูตรของ PLO ข้อหนึ่ง
│   ├── PLOStudentBreakdown.jsx / YLOStudentBreakdown.jsx
│   │                                 ตารางรายบุคคลของ PLO/YLO ข้อหนึ่ง (พร้อมตัวกรอง/เรียงลำดับ)
│   ├── StudentYearBreakdown.jsx     รายวิชา+YLO ของนักศึกษาคนหนึ่ง ไล่ตามชั้นปี (หน้า /student-plo)
│   ├── CourseCLOBreakdown.jsx       เจาะลึก CLO→คะแนน ของนักศึกษาคนหนึ่งในวิชาหนึ่ง (ใช้ซ้ำหลายที่)
│   ├── ScoresPanel.jsx              "กรอกคะแนน" แบบตารางสเปรดชีต (ใช้ทั้งฝั่งอาจารย์และแอดมิน)
│   ├── CLOAchievementPanel.jsx      "ผลบรรลุ CLO" ระดับชั้นเรียน (ใช้ทั้งฝั่งอาจารย์และแอดมิน)
│   ├── BulkEnrollPanel.jsx          ลงทะเบียนแบบกลุ่ม (เลือกหลายคน + อัปโหลดไฟล์)
│   │
│   ├── admin/
│   │   ├── CrudManager.jsx          ตัวจัดการ CRUD กลาง (ตาราง+ฟอร์ม+ลบ) ใช้ซ้ำใน ~16 หน้า admin
│   │   └── course-offering-workspace/
│   │       ├── EnrollmentTab.jsx    แท็บ "นักศึกษาลงทะเบียน" ของหน้า CourseOfferingWorkspace
│   │       └── StructureTab.jsx     แท็บ "โครงสร้างการประเมิน" (สร้าง CLO + งานประเมิน + ผูกกัน)
│   │
│   └── layout/
│       ├── AppLayout.jsx            โครงหน้าหลัก (sidebar+topbar+เนื้อหา) - ครอบทุก route ที่ล็อกอินแล้ว
│       ├── Sidebar.jsx              เมนูนำทางซ้าย (เปลี่ยนตาม role: admin/instructor)
│       └── Topbar.jsx               แถบบน - โปรไฟล์ผู้ใช้ + ออกจากระบบ
│
└── pages/                    หน้า = สิ่งที่ผูกกับ route ใน App.jsx โดยตรง
    ├── Login.jsx / Profile.jsx
    ├── PLODashboard.jsx              "ภาพรวม PLO ทั้งหลักสูตร" (หน้าแรกของ admin, route /dashboard)
    ├── PLODetailPage.jsx             รายละเอียด PLO ข้อหนึ่ง
    ├── PLOCourseDetailPage.jsx       นักศึกษาที่ลงทะเบียนวิชาหนึ่ง เทียบกับ PLO ข้อหนึ่ง
    ├── PLOAchievement.jsx            โปรไฟล์ PLO/YLO/รายวิชาของนักศึกษาคนเดียว (route /student-plo)
    ├── StudentCourseCLOPage.jsx      ผลบรรลุ CLO ของนักศึกษาคนหนึ่งในวิชาหนึ่ง (route /student-clo)
    ├── YLOYearProgress.jsx           "YLO ตามชั้นปี" (route /ylo-by-year)
    ├── StudentList.jsx               รายชื่อนักศึกษา (drill-down หลักสูตร -> รุ่น/หมู่ -> ตาราง)
    ├── CurriculumCourses.jsx         "หลักสูตร/รายวิชา" (ดู + แก้ไขได้ถ้าเป็น admin)
    ├── InstructorHome.jsx            หน้าหลักของอาจารย์ (การ์ดวิชาที่สอน + จับจองวิชาว่าง)
    ├── ScoreManagement.jsx           "จัดการคะแนน (รายคน)" (route /scores)
    │
    └── admin/                 หน้าเฉพาะ admin (ครอบด้วย <ProtectedRoute requireAdmin>)
        ├── AdminHome.jsx             ศูนย์กลางลิงก์ไปทุกหน้า admin (route /admin)
        ├── CourseOfferingWorkspace.jsx   "จัดการวิชาที่สอน" (route /course-workspace) - ดูหัวข้อถัดไป
        ├── AdminCourseGrading.jsx    "กรอกคะแนน/ผลบรรลุ CLO" แบบย่อสำหรับ admin (ไม่มีแท็บลงทะเบียน/
        │                             โครงสร้างการประเมิน เพราะมีหน้าแยกอยู่แล้ว)
        ├── AdminEnrollments.jsx      ลงทะเบียนนักศึกษาด้วยตนเอง (master-detail: เลือกนักศึกษาก่อนเสมอ)
        ├── AdminRosterImport.jsx     นำเข้ารายชื่อจากไฟล์ Excel ของมหาวิทยาลัย (.xls/.xlsx)
        └── Admin{PLO,YLO,Course,CLO,...}.jsx, AddCurriculum.jsx, AddStudent.jsx, ฯลฯ
                                      หน้า CRUD มาตรฐาน (ประกาศ columns แล้วส่งเข้า CrudManager.jsx)
```

### จุดที่ย้ายไปในเฟส 1 (จัดระเบียบโครงสร้าง)

`CourseOfferingWorkspace.jsx` เดิมมีขนาด ~1200 บรรทัด รวม 3 component ไว้ไฟล์เดียว ถูกแยกเป็น:
- `pages/admin/CourseOfferingWorkspace.jsx` (component หลัก ถือ state ร่วม + สลับแท็บ)
- `components/admin/course-offering-workspace/EnrollmentTab.jsx`
- `components/admin/course-offering-workspace/StructureTab.jsx`

และ pattern "fetch list แล้ว map เป็น dropdown options" ที่ซ้ำกันใน 9 หน้า admin ถูกรวมเป็น
`hooks/useOptions.js` — ทั้งสองอย่างนี้เป็น**การจัดระเบียบเท่านั้น ไม่มี behavior ไหนเปลี่ยน** (route,
endpoint, props เดิมทุกจุด)

## Data flow หลัก: คำนวณ "บรรลุ PLO" ยังไงจริงๆ

Frontend **ไม่คำนวณผลบรรลุเอง** ทั้งหมดคำนวณที่ backend แล้วส่งตัวเลขสำเร็จรูปมาให้แสดงผล ลำดับจริง
(อ้างอิงจาก endpoint ที่เรียก):

1. `Student Score` (คะแนนดิบ) → ผ่าน `item_clo` (น้ำหนัก%) → คำนวณ % บรรลุของแต่ละ **CLO**
2. ทุก CLO ของวิชาที่ `course_plo.responsibility_level = "primary"` นับเท่ากันหมด → รวมเป็นผลบรรลุ
   **วิชา** นั้นต่อ PLO ข้อหนึ่ง (ผ่าน/ไม่ผ่าน)
3. รวมผลทุกวิชา "หลัก" ของ PLO ข้อนั้น → ผลบรรลุ **PLO** ของนักศึกษาคนนั้น (all-or-nothing: บรรลุ 100%
   หรือไม่บรรลุ 0% ไม่มีค่ากลาง — นี่คือเหตุผลที่ `PLOChipGrid`/`PLOSummaryStats`/ตัวกรอง "ช่วง % บรรลุ"
   ในทางปฏิบัติมีแต่ 0% กับ 100% เท่านั้น)
4. **YLO** คำนวณจากวิชาที่อยู่ใน `study_plan` ของชั้นปีนั้นๆ (ไม่สะสมข้ามปี) แบบ all-or-nothing เช่นกัน

endpoint หลักที่ frontend เรียกเพื่อดึงตัวเลขเหล่านี้ (ดู `api/client.js`):
- `GET /plo/achievement?student_id=` — PLO ของนักศึกษาคนเดียว
- `GET /plo/achievement/cohort?curriculum_id=&cohort_year=` — สรุป PLO ทั้งรุ่น/หลักสูตร
- `GET /ylo/achievement/student?student_id=` — YLO ทุกปีของนักศึกษาคนเดียว
- `GET /ylo/achievement/by-year?curriculum_id=&year_level=&cohort_year=` — สรุป YLO ทั้งรุ่นแยกตามปี
- `GET /clo-achievement?offering_id=` — ผลบรรลุ CLO ระดับชั้นเรียนของวิชาที่เปิดสอนหนึ่งๆ
- `GET /clo-achievement/student-course?student_id=&course_id=` — เจาะลึก CLO→คะแนน ของคนเดียว/วิชาเดียว

## ระบบ Auth และ Role

- Login เรียก `POST /auth/login` (OAuth2 form, ไม่ใช่ JSON) ได้ JWT กลับมา เก็บใน `localStorage`
  (key: `plo_auth`, ดู `api/client.js` / `AuthContext.jsx`)
- ทุก request หลังจากนั้นแนบ `Authorization: Bearer <token>` อัตโนมัติผ่าน axios interceptor
- ถ้า backend ตอบ 401 (token หมดอายุ/ไม่ถูกต้อง) → interceptor เคลียร์ localStorage แล้วเด้งไป `/login`
  ทันที ไม่ต้องเช็คเองทุกหน้า
- 2 roles: `admin`, `instructor` — `ProtectedRoute` เช็คแค่ "ล็อกอินหรือยัง" กับ "เป็น admin หรือไม่"
  (prop `requireAdmin`) การเช็คสิทธิ์ระดับข้อมูล (เช่น อาจารย์แก้ได้เฉพาะวิชาตัวเอง) ทำที่ **backend**
  ทั้งหมด — frontend แค่ซ่อน/แสดงปุ่มตาม `isAdmin`/`user.role` เพื่อ UX เท่านั้น ไม่ใช่ชั้นความปลอดภัยจริง

## การเชื่อมต่อกับ Backend

- Base URL อ่านจาก env var `VITE_API_BASE_URL` (ดู `.env.example`) ถ้าไม่ตั้งไว้ fallback เป็น
  `http://localhost:8000`
- ทุกการเรียก backend ผ่าน `src/api/client.js` ไฟล์เดียว (axios instance เดียว) — ไม่มีที่ไหนในระบบ
  ยิง `fetch`/`axios` ตรงนอกไฟล์นี้ ทำให้ auth header และการจัดการ 401 ครอบคลุมทุก request โดยอัตโนมัติ

## จุดที่ควรระวัง / เคยมีบั๊กมาก่อน

(สรุปจาก `project_overview.md` ของทีม — ดูรายละเอียดเต็มที่นั่น)

- **เรียงรายชื่อนักศึกษาต้องเรียงตาม `student_id` แบบตัวเลข ไม่ใช่ string** — เคยมีบั๊กที่ frontend
  sort ทับ backend ด้วยคีย์ผิด (ชื่อ แทนรหัส) ทำให้ลำดับไม่ตรงกัน ปัจจุบัน comparator ทุกจุด
  (`compareStudentRows` ใน `utils/studentFilters.js`, `compareRoster` ใน `StudentList.jsx`,
  ตรรกะเรียงใน `PLOCourseDetailPage.jsx`) แปลงเป็น `Number(...)` ก่อนเทียบเสมอ กัน string sort พัง
  (เช่น "9" ไปอยู่หลัง "10")
- **`.workspace-hint` vs `.workspace-hint-inline`** — สอง class นี้หน้าตาเหมือนกันแต่ margin ต่างกัน
  (`.workspace-hint` มี margin-top ติดลบ ออกแบบไว้ให้ใช้ต่อจาก `<h1>`/`<h2>` เท่านั้น) เคยเอาไปใช้ผิดที่
  จนข้อความซ้อนทับกัน — ใช้ `.workspace-hint-inline` เสมอถ้าไม่ได้อยู่ต่อจากหัวข้อโดยตรง
- **ผลบรรลุ PLO/YLO เป็น all-or-nothing** (0% หรือ 100% เท่านั้น) — ตัวกรอง "ช่วง % บรรลุ" ที่มีตัวเลือก
  1-49%/50-99% จะไม่มีผลลัพธ์เลยในทางปฏิบัติทุกวันนี้ (เผื่อไว้ล่วงหน้าถ้ากติกาคำนวณเปลี่ยนในอนาคต ไม่ใช่บั๊ก)
- **`AdminYLOPLOMapping.jsx`** — ตัวเลือก YLO ต้อง join กับ `listCurricula()` เพื่อแสดงชื่อหลักสูตร
  (ไม่ใช่แค่ปีที่) จึงไม่ได้ใช้ `useOptions` hook เหมือนหน้าอื่น (hook รองรับแค่ endpoint เดียวต่อครั้ง)
  เขียนแยกด้วย `Promise.all` เอง
- **`index.css` เป็นไฟล์เดียวรวมทั้งระบบ ไม่มี CSS module** — className ทั้งหมดเป็น global scope
  ระวังตอนเพิ่ม class ใหม่อย่าซ้ำชื่อกับที่มีอยู่แล้วโดยไม่ตั้งใจ
- **โลโก้ใน Sidebar ยังเป็น placeholder ตัวอักษร "CS"** รอไฟล์โลโก้จริงของมหาวิทยาลัยมาเปลี่ยน

## Tech Stack

| Layer | รายละเอียด |
|---|---|
| Framework | React 18 + Vite 5 (JavaScript ล้วน ไม่มี TypeScript/tsconfig) |
| Routing | react-router-dom v6 |
| HTTP | axios (instance เดียวใน `api/client.js`) |
| Icons | lucide-react |
| Styling | CSS ธรรมดาไฟล์เดียว (`index.css`) ไม่มี CSS-in-JS/CSS module |
| Dev server | `npm run dev` (พอร์ต 3000 ปกติ) |
| Build | `npm run build` (ไม่มี lint/type-check config ในโปรเจกต์ - ใช้ `vite build` เป็นตัวเช็ค
        syntax/import error แทน) |
