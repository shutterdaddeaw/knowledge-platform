const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require("socket.io");
const cors = require('cors');
const ExcelJS = require('exceljs');
const { Course, Question, User, Result, AllowedEmployee } = require('./models/Schemas');

// --- CONFIGURATION ---
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quiz_platform')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// --- SCORING CONFIG ---
const BASE_SCORE = 1000;
const TIME_BONUS_FACTOR = 50;

// ==========================
// 1. REST API ROUTES
// ==========================

// [User] ตรวจสอบ Employee ID (Login)
app.post('/api/validate-user', async (req, res) => {
    try {
        const { employeeId } = req.body;
        const allowed = await AllowedEmployee.findOne({ employeeId });
        if (!allowed) {
            return res.status(403).json({ valid: false, error: 'Employee ID not authorized' });
        }
        res.json({ valid: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [User] ดึงรายชื่อคอร์ส (เฉพาะ Active + Mode != closed ถ้าต้องการซ่อน? เอา active=true พอ)
app.get('/api/courses', async (req, res) => {
    try {
        const courses = await Course.find({ isActive: true });
        res.json(courses);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [Admin] ดึงรายชื่อคอร์สทั้งหมด (รวมที่ปิดอยู่)
app.get('/api/admin/courses', async (req, res) => {
    try {
        const courses = await Course.find({});
        res.json(courses);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [Admin] สร้างคอร์สใหม่
app.post('/api/courses', async (req, res) => {
    try {
        const course = await Course.create(req.body);
        res.json(course);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [Admin] อัปเดตคอร์ส
app.put('/api/courses/:id', async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(course);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [Admin] ลบคอร์ส (Soft Delete or Hard Delete)
app.delete('/api/courses/:id', async (req, res) => {
    try {
        await Course.findByIdAndDelete(req.params.id);
        // Optional: Delete related questions/results
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [User] เข้าคอร์ส
app.post('/api/join-course', async (req, res) => {
    const { employeeId, nickname, courseId } = req.body;
    try {
        // 🔥 Check if Employee ID is allowed
        const allowed = await AllowedEmployee.findOne({ employeeId });
        if (!allowed) {
            return res.status(403).json({ error: 'Employee ID not authorized' });
        }

        let user = await User.findOneAndUpdate(
            { employeeId, currentCourseId: courseId },
            { nickname, currentCourseId: courseId },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [User] ดึง Pre-test (Fetched ALL questions for the course)
app.get('/api/pre-test/:courseId', async (req, res) => {
    try {
        const questions = await Question.find({
            courseId: req.params.courseId
        });
        res.json(questions);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [User] ส่ง Pre-test
app.post('/api/submit-pretest', async (req, res) => {
    const { userId, answers, courseId } = req.body;
    try {
        let totalScore = 0;
        for (let ans of answers) {
            const question = await Question.findById(ans.questionId);
            const isCorrect = question && question.correctIndex === ans.selectedOptionIndex; // Ensure Validation

            // Pre-test score calculation (simple +10 or similar, or just stored for stats)
            // User requested comparison, so we should store a "score". keeping it simple: 1 point per correct answer?
            // Or use same BASE_SCORE? Let's use BASE_SCORE (1000) for consistency in comparison, but no time bonus.
            const score = isCorrect ? BASE_SCORE : 0;
            totalScore += score;

            await Result.create({
                userId,
                courseId,
                questionId: ans.questionId,
                isCorrect,
                scoreEarned: score,
                type: 'pre-test'
            });
        }
        res.json({ success: true, totalScore });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --------------------------------------------------------
// 🔥 [จุดที่แก้] API ดึงคำถามสำหรับ Admin (Post-test)
// --------------------------------------------------------
// [Admin] ดึงคำถามทั้งหมดของคอร์ส (รองรับ Filter)
app.get('/api/questions/:courseId', async (req, res) => {
    try {
        const filter = { courseId: req.params.courseId };
        // We removed strict type, so just return all questions
        const questions = await Question.find(filter);
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// [Admin] เพิ่มคำถาม
app.post('/api/questions', async (req, res) => {
    try {
        const question = await Question.create(req.body);
        res.json(question);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [Admin] แก้ไขคำถาม
app.put('/api/questions/:id', async (req, res) => {
    try {
        const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(question);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [Admin] ลบคำถาม
app.delete('/api/questions/:id', async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// [Admin] Export Report
app.get('/api/admin/export-report', async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report');
        worksheet.columns = [
            { header: 'ID', key: 'id' }, { header: 'Name', key: 'name' },
            { header: 'Pre', key: 'pre' }, { header: 'Post', key: 'post' }
        ];
        // (ใส่ Logic Export เต็มๆ ที่นี่ ถ้าต้องการ)
        res.end();
    } catch (err) { res.status(500).send('Export Error'); }
});

// [Admin] Allowed Employee Management
app.get('/api/admin/employees', async (req, res) => {
    try {
        const employees = await AllowedEmployee.find().sort({ createdAt: -1 });
        res.json(employees);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/employees', async (req, res) => {
    try {
        // Support bulk add (comma separated or newline) if needed, but for now single
        const { employeeId } = req.body;
        const emp = await AllowedEmployee.create({ employeeId });
        res.json(emp);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/employees/:id', async (req, res) => {
    try {
        await AllowedEmployee.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [Admin] Score Comparison Report
app.get('/api/admin/comparison/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        const users = await User.find({ currentCourseId: courseId });

        const report = await Promise.all(users.map(async (user) => {
            // Calculate Pre-test Score (Count Correct Answers)
            const preResults = await Result.find({ userId: user._id, courseId, type: 'pre-test' });
            const preScore = preResults.filter(r => r.isCorrect).length;

            // Calculate Post-test Score (Count Correct Answers)
            const postResults = await Result.find({ userId: user._id, courseId, type: 'post-test' });
            // Count unique questions answered correctly in post-test (if multiple attempts allowed, or just trust the log)
            // Ideally distinct questionId.
            const uniquePostCorrect = new Set(postResults.filter(r => r.isCorrect).map(r => r.questionId.toString())).size;
            const postScore = uniquePostCorrect;

            let improvement = 0;
            if (preScore > 0) {
                improvement = ((postScore - preScore) / preScore) * 100;
            } else if (postScore > 0) {
                improvement = 100;
            }

            return {
                employeeId: user.employeeId,
                nickname: user.nickname,
                preScore,
                postScore,
                improvement: improvement.toFixed(2) + '%'
            };
        }));

        res.json(report);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// --------------------------------------------------------

// [Admin] Export Report (Detailed)
app.get('/api/admin/export-report', async (req, res) => {
    console.log(`[EXPORT] Request received for courseId: ${req.query.courseId}`);
    try {
        const { courseId } = req.query; // Expect courseId query param ?courseId=...
        if (!courseId) return res.status(400).send('Course ID required');

        const users = await User.find({ currentCourseId: courseId });
        const questions = await Question.find({ courseId: courseId }); // Get all questions to map columns

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Main Report');

        // Define Columns
        const columns = [
            { header: 'Employee ID', key: 'employeeId', width: 15 },
            { header: 'Nickname', key: 'nickname', width: 20 },
            { header: 'Pre-test Score', key: 'preScore', width: 15 },
            { header: 'Post-test Score', key: 'postScore', width: 15 },
            { header: 'Improvement', key: 'improvement', width: 15 },
        ];

        // Add dynamic columns for each Question (Result + Time)
        // Assume post-test questions are the main concern for "Live"
        questions.forEach((q, i) => {
            columns.push({ header: `Q${i + 1} Result`, key: `q${i}_res`, width: 12 });
            columns.push({ header: `Q${i + 1} Time(s)`, key: `q${i}_time`, width: 12 });
        });

        worksheet.columns = columns;

        // Process Rows
        for (const user of users) {
            const preResults = await Result.find({ userId: user._id, courseId, type: 'pre-test' });
            const preScore = preResults.filter(r => r.isCorrect).length;

            const postResults = await Result.find({ userId: user._id, courseId, type: 'post-test' });
            // Calculate post score (count correct)
            const postScore = postResults.filter(r => r.isCorrect).length;

            let improvement = 0;
            if (preScore > 0) improvement = ((postScore - preScore) / preScore) * 100;
            else if (postScore > 0) improvement = 100;

            const rowData = {
                employeeId: user.employeeId,
                nickname: user.nickname,
                preScore,
                postScore,
                improvement: improvement.toFixed(1) + '%'
            };

            // Map Question Details
            questions.forEach((q, i) => {
                // Find result for this specific question
                const res = postResults.find(r => r.questionId.toString() === q._id.toString());
                if (res) {
                    rowData[`q${i}_res`] = res.isCorrect ? '✅ Correct' : '❌ Wrong';
                    rowData[`q${i}_time`] = res.timeTaken ? (res.timeTaken / 1000).toFixed(2) : '-';
                } else {
                    rowData[`q${i}_res`] = '-';
                    rowData[`q${i}_time`] = '-';
                }
            });

            worksheet.addRow(rowData);
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Export Error: ' + err.message);
    }
});

// ==========================
// 2. SOCKET.IO
// ==========================
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_course_room', async ({ courseId, userId }) => {
        socket.join(courseId);
        socket.userId = userId;
        socket.courseId = courseId;
    });

    // Simple in-memory lock state
    const courseLocks = {};

    socket.on('admin_start_question', async ({ courseId, questionId }) => {
        console.log(`🚀 Admin ปล่อยคำถาม ID: ${questionId}`);
        courseLocks[courseId] = false; // Unlock
        const question = await Question.findById(questionId);
        if (!question) return;

        io.to(courseId).emit('receive_question', {
            _id: question._id,
            text: question.text,
            options: question.options,
            timeLimit: question.timeLimit,
            startTime: Date.now()
        });
    });

    socket.on('admin_end_question', ({ courseId }) => {
        console.log(`🛑 Admin สั่งหมดเวลา Course: ${courseId}`);
        courseLocks[courseId] = true; // Lock
        io.to(courseId).emit('question_timeout');
    });

    socket.on('submit_answer', async ({ questionId, answerIndex, clientStartTime }) => {
        if (!socket.userId || !socket.courseId) return;

        // Check Lock
        if (courseLocks[socket.courseId]) {
            console.log(`⚠️ User ${socket.userId} tried to answer after manual timeout.`);
            return;
        }

        const question = await Question.findById(questionId);
        const isCorrect = question.correctIndex === answerIndex;

        // คำนวณคะแนน
        const timeTaken = Date.now() - clientStartTime;
        const maxTimeMs = question.timeLimit * 1000;
        const timeLeft = Math.max(0, maxTimeMs - timeTaken);
        const score = isCorrect ? (BASE_SCORE + Math.floor((timeLeft / 1000) * TIME_BONUS_FACTOR)) : 0;

        await Result.create({
            userId: socket.userId, courseId: socket.courseId,
            questionId: question._id, isCorrect,
            scoreEarned: score, type: 'post-test',
            timeTaken: timeTaken // Save the time taken (ms)
        });

        if (score > 0) await User.findByIdAndUpdate(socket.userId, { $inc: { totalScore: score } });

        socket.emit('answer_result', { isCorrect, score });

        const topUsers = await User.find({ currentCourseId: socket.courseId }).sort({ totalScore: -1 }).limit(5);
        io.to(socket.courseId).emit('update_leaderboard', topUsers);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
