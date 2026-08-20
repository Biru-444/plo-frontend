# PLO Evaluation System — Frontend

React + Vite frontend สำหรับระบบประเมินผลลัพธ์การเรียนรู้ระดับหลักสูตร (Program Learning
Outcomes) ตามแนวทาง Outcome-Based Education (OBE) คู่กับ backend ที่
[plo-evaluation](https://github.com/thadchai-glitch/plo-evaluation) (FastAPI + PostgreSQL) —
ต้องรัน backend คู่กันด้วยถึงจะใช้งานได้จริง

## เริ่มต้นใช้งาน

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า environment variables

```bash
cp .env.example .env
```

ค่าเริ่มต้นคือ `VITE_API_BASE_URL=http://localhost:8000` ซึ่งตรงกับที่ backend รันอยู่

### 3. รัน backend ก่อน

จาก repo [plo-evaluation](https://github.com/thadchai-glitch/plo-evaluation):

```bash
uvicorn app.main:app --reload
```

จะรันที่ `http://localhost:8000`

### 4. รัน frontend

```bash
npm run dev
```

จะเปิดที่ `http://localhost:3000`

> **หมายเหตุเรื่อง CORS**: backend (`app/main.py`) อนุญาตเฉพาะ origin
> `http://localhost:3000` และ `http://localhost:8080` เท่านั้น
> `vite.config.js` ในโปรเจกต์นี้จึงตั้งพอร์ตเป็น 3000 ไว้ให้แล้ว
> ถ้าจะเปลี่ยนพอร์ต ต้องไปแก้ `allow_origins` ในฝั่ง backend ด้วย

## โครงสร้างโปรเจกต์

```
src/
├── api/
│   └── client.js               # axios client + ฟังก์ชันเรียก API ทุก endpoint
├── components/
│   ├── admin/CrudManager.jsx   # component กลาง list+เพิ่ม+แก้ไข+ลบ ใช้ซ้ำทุกตารางใน /admin
│   └── ...                     # PLOBar, PLOCohortBar, PLORadarChart, StudentProfileCard ฯลฯ
├── context/AuthContext.jsx     # เก็บ session/JWT, isAdmin
├── pages/
│   ├── PLOAchievement.jsx      # ผลบรรลุ PLO รายบุคคล (พร้อม radar chart, export PDF)
│   ├── StudentList.jsx         # รายชื่อนักศึกษา แยกแท็บตามรุ่น
│   ├── CurriculumCourses.jsx   # เรียกดูหลักสูตร/รายวิชา
│   ├── PLODashboard.jsx        # ภาพรวม PLO ทั้งรุ่น พร้อม drill-down รายคน
│   ├── PLOYearProgress.jsx     # ภาพรวม PLO แยกตามชั้นปี เทียบกับเป้าหมาย YLO
│   ├── ScoreManagement.jsx     # กรอก/แก้ไขคะแนนนักศึกษา
│   └── admin/                  # หน้าจัดการข้อมูล (admin เท่านั้น) ครบทุกตารางในระบบ
├── App.jsx                     # layout + routing
└── main.jsx                    # entry point
```

## ฟีเจอร์หลัก

- **ผลการบรรลุ PLO รายบุคคล** (`/`) — ค้นหานักศึกษา แสดงโปรไฟล์, สรุปภาพรวม, radar chart,
  รายละเอียดรายข้อ, export เป็น PDF (ผ่าน print ของเบราว์เซอร์)
- **รายชื่อนักศึกษา** (`/students`) — แยกแท็บตามรุ่น พร้อมสถานะการศึกษา
- **หลักสูตร/รายวิชา** (`/curriculum`) — เรียกดูรายวิชาตามหลักสูตร
- **ภาพรวม PLO** (`/dashboard`) — ค่าเฉลี่ยทั้งรุ่นต่อ PLO พร้อม drill-down รายชื่อนักศึกษา
- **PLO ตามชั้นปี** (`/plo-by-year`) — ผลบรรลุ PLO แยกตามชั้นปี เทียบกับเป้าหมาย YLO ของปีนั้น
- **จัดการคะแนน** (`/scores`) — กรอก/แก้ไขคะแนนต่อชิ้นงาน
- **จัดการระบบ** (`/admin`, เฉพาะ role admin) — CRUD ครบทุกตาราง (หลักสูตร, PLO, YLO, รายวิชา,
  CLO, การเปิดสอน, นักศึกษา, การลงทะเบียน, ผู้ใช้งาน ฯลฯ)
