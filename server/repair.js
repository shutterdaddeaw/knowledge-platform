const mongoose = require('mongoose');
const { Course, Question, User, Result } = require('./models/Schemas');

// เช็ค URL ให้ตรงกับ server.js เป๊ะๆ
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/quiz_platform';

async function repairData() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected!');

        // 1. ล้างข้อมูลเก่า
        console.log('🧹 Clearing old data...');
        await Course.deleteMany({});
        await Question.deleteMany({});
        await User.deleteMany({});
        await Result.deleteMany({});

        // 2. สร้างคอร์สภาษี
        console.log('🏗️ Creating Course...');
        const taxCourse = await Course.create({
            title: 'ภาษีเงินได้บุคคลธรรมดา (Personal Income Tax)',
            description: 'หลักสูตรปูพื้นฐานภาษี เข้าใจง่าย คำนวณเองได้',
            isActive: true
        });
        console.log(`👉 Course Created ID: ${taxCourse._id}`);

        // 3. สร้างคำถาม (Post-test)
        console.log('📝 Creating Questions...');
        const postTestQuestions = [
            {
                text: 'สูตรการหา "เงินได้สุทธิ" คือ?',
                options: ['รายได้-ค่าใช้จ่าย', 'รายได้-ภาษี', 'รายได้-ค่าใช้จ่าย-ค่าลดหย่อน', 'ผิดทุกข้อ'],
                correctIndex: 2,
                timeLimit: 20
            },
            {
                text: 'ยื่นภาษีเกินกำหนด เสียเงินเพิ่มเดือนละกี่ %?',
                options: ['1%', '1.5%', '7%', '10%'],
                correctIndex: 1,
                timeLimit: 20
            }
        ];

        for (const q of postTestQuestions) {
            await Question.create({
                ...q,
                type: 'post-test', // สำคัญมาก ต้องตรงกับที่ API เรียกหา
                courseId: taxCourse._id
            });
        }
        console.log('✅ Questions inserted.');

        // 4. [สำคัญ] ทดสอบดึงข้อมูลทันทีเพื่อยืนยัน
        console.log('\n--- 🕵️ VERIFICATION CHECK ---');
        const checkQuestions = await Question.find({ 
            courseId: taxCourse._id, 
            type: 'post-test' 
        });

        if (checkQuestions.length > 0) {
            console.log(`🎉 SUCCESS! พบคำถามจำนวน ${checkQuestions.length} ข้อ ในฐานข้อมูล`);
            console.log(`ตัวอย่าง ID: ${checkQuestions[0]._id}`);
            console.log('ตอนนี้คุณสามารถไป Refresh หน้าเว็บได้เลย!');
        } else {
            console.error('❌ FAILURE: สร้างแล้วแต่หาไม่เจอ! โปรดเช็ค Schema หรือ Connection String');
        }

        process.exit();

    } catch (err) {
        console.error('❌ ERROR:', err);
        process.exit(1);
    }
}

repairData();