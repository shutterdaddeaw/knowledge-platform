# Knowledge Sharing Platform (KSP) - System Manual

## 1. System Requirements (ความต้องการของระบบ)
เพื่อให้ระบบทำงานได้สมบูรณ์ จำเป็นต้องมีสภาพแวดล้อมดังนี้:

### Hardware (Server/Dev Machine)
- **CPU**: 2 Core ขึ้นไป recommended
- **RAM**: 4GB ขึ้นไป
- **Storage**: พื้นที่ว่างสำหรับโปรเจกต์และฐานข้อมูล (min 10GB)

### Software
- **OS**: Windows, macOS, หรือ Linux
- **Node.js**: Version 14.x หรือ 16.x ขึ้นไป (Run JavaScript Server)
- **MongoDB**: เวอร์ชัน 4.0 ขึ้นไป (Database สำหรับเก็บข้อมูล Users, Courses, Results)

### Client Side (User/Admin)
- **Web Browser**: Google Chrome, Edge, Firefox, หรือ Safari (เวอร์ชันล่าสุด)
- **Internet/Network**: ต้องเชื่อมต่อวง LAN หรือ Internet เดียวกับ Server ได้

---

## 2. System Capabilities (ความสามารถของระบบ)

### สำหรับผู้ดูแลระบบ (Admin)
1.  **Dashboard Management**:
    - สร้าง, แก้ไข, ลบ คอร์สเรียน (Courses)
    - กำหนดสถานะคอร์ส: Closed, Pre-test (Self-paced), Post-test (Live)
2.  **Course Content (เนื้อหาบทเรียน)**:
    - สร้างบทเรียนแบบ Multi-chapter ได้
    - รองรับ Rich Text และการแปะลิงก์ Youtube (Embed อัตโนมัติ) หรือ Web Links
3.  **Question Bank (คลังข้อสอบ)**:
    - เพิ่ม/ลบ แก้ไข คำถามสำหรับแต่ละคอร์ส
    - กำหนดตัวเลือก (A, B, C, D) และเวลาตอบ (Time Limit)
4.  **User Management**:
    - จัดการรายชื่อพนักงานที่อนุญาตให้เข้าใช้งาน (Employee IDs)
    - รองรับการ Import รายชื่อผ่านไฟล์ CSV
5.  **Live Quiz Controller**:
    - ควบคุมการปล่อยข้อสอบแบบ Real-time (Socket.io)
    - แสดง **Live Leaderboard** (Top 20 Persons)
6.  **Reporting & Analysis**:
    - ดูตารางเปรียบเทียบคะแนน Pre-test vs Post-test
    - **Export to Excel**: ดาวน์โหลดรายงานละเอียดรวมถึง เวลาที่ใช้ในแต่ละข้อ (Time Taken) และผลลัพธ์รายข้อ

### สำหรับผู้ใช้งาน (User)
1.  **Access Control**: เข้าสู่ระบบด้วย Employee ID และ Nickname (ต้องได้รับอนุญาตแล้วเท่านั้น)
2.  **Study Mode**:
    - เข้าเรียนเนื้อหา ดูวิดีโอ และอ่านบทความก่อนทำแบบทดสอบ
3.  **Testing Modes**:
    - **Pre-test**: ทำแบบทดสอบก่อนเรียน (เก็บคะแนน, ไม่จับเวลา Real-time)
    - **Post-test (Live)**: เข้าร่วมห้องสอบสด แข่งขันตอบคำถามพร้อมกันกับเพื่อนร่วมงาน
    - แสดงผลคะแนนและเฉลยทันทีหลังจบแต่ละข้อ

---

## 3. Getting Started & Testing (การเริ่มต้นและการทดสอบ)

### Step 1: Installation (ติดตั้ง)
1.  **Database**: ติดตั้งและรัน MongoDB (Default Port 27017)
2.  **Server (Backend)**:
    - เข้าโฟลเดอร์ `server`
    - รันคำสั่ง: `npm install` (ลง library เช่น express, mongoose, socket.io, exceljs)
    - รันคำสั่ง: `npm start` (Server จะเริ่มทำงานที่ Port 3000)
3.  **Client (Frontend)**:
    - เข้าโฟลเดอร์ `client`
    - รันคำสั่ง: `npm install`
    - รันคำสั่ง: `npm run dev` (Web จะรันที่ Port 5173 โดยประมาณ)

### Step 2: Basic Workflow Test (ลำดับการใช้งานจริง)

#### 1. Setup Data (Admin)
- เปิด Browser เข้า `http://localhost:5173/?admin=dashboard`
- ไปที่แท็บ **Employees**:
    - กด "Add Manually" หรือ "Import CSV" เพื่อใส่ Employee ID ของเรา (เช่น `EMP001`)
- ไปที่แท็บ **Courses**:
    - สร้างคอร์สใหม่ (เช่น "Basic Fire Safety")
    - เพิ่ม Chapter และใส่ Link Youtube เพื่อทดสอบ Player
    - ตั้งค่า Mode เป็น `Pre-test` (เพื่อให้ User ลองเล่นเองก่อนได้) หรือ `Post-test` (ถ้าจะเปิดห้องสอบสด)
- ไปที่แท็บ **Questions**:
    - เลือกคอร์ส และเพิ่มคำถามอย่างน้อย 2-3 ข้อ

#### 2. User Learning (User)
- เปิด Browser อีกหน้าต่าง (Incognito recommended) เข้า `http://localhost:5173`
- Login ด้วย `EMP001` / `TestName`
- เลือกคอร์สที่สร้างไว้
- **Study Tab**: ลองกดดูวิดีโอและลิงก์ต่างๆ
- **Test Tab**:
    - ถ้าเป็น **Pre-test**: จะเห็นข้อสอบ กดทำและส่งคำตอบได้เลย
    - ถ้าเป็น **Post-test**: จะขึ้น "Waiting for Host" (ต้องรอ Admin กดเริ่ม)

#### 3. Live Session (Admin + User)
- **Admin**: เปลี่ยน Mode คอร์สเป็น `Post-test` (ใน Dashboard) -> กด "Go to Live Controller"
- **User**: จะเห็นหน้าจอ Waiting
- **Admin**: กดเลือกคำถาม (Q1) เพื่อปล่อยข้อสอบ
- **User**: จะเห็นคำถามเด้งขึ้นมาพร้อมเวลานับถอยหลัง -> กดตอบ
- **Admin**: จขบข้อ หน้าจอจะแสดงถูกต้อง/ผิด และคะแนน
- **Result**: Admin จะเห็น Leaderboard อัปเดต Real-time

#### 4. Export Data
- **Admin**: กลับมาที่ Dashboard -> แท็บ **Analysis**
- เลือกคอร์ส -> ตรวจสอบตารางคะแนน
- กดปุ่ม **Export Excel (Detailed)** เพื่อดูไฟล์สรุปผล
