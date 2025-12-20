const mongoose = require('mongoose');
const { Course, Question, User, Result } = require('./models/Schemas');

// เปลี่ยนเป็น Connection String ของคุณ (ถ้าใช้ Cloud ให้ใส่ URL ของ Atlas)
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quiz_platform');

const seedData = async () => {
    console.log('Clearing old data...');
    await Course.deleteMany({});
    await Question.deleteMany({});
    await User.deleteMany({});
    await Result.deleteMany({});

    console.log('Creating Tax Course...');
    // 1. สร้างคอร์สภาษี พร้อมลิงก์ความรู้
    const taxCourse = await Course.create({
        title: 'ภาษีเงินได้บุคคลธรรมดา (Personal Income Tax)',
        description: 'หลักสูตรปูพื้นฐานภาษี เข้าใจง่าย คำนวณเองได้ พร้อมเครื่องมือช่วยวางแผนลดหย่อน',
        resourceLinks: [
            {
                title: 'แอพคำนวณภาษี TaxPro',
                url: 'https://hrpiramid.github.io/TaxPro',
                type: 'app'
            },
            {
                title: 'Video: 3 เรื่องต้องรู้ก่อนคำนวณภาษี',
                url: 'https://www.youtube.com/watch?v=EJAcoy2HrT8',
                type: 'video'
            }
        ]
    });

    // 2. สร้างคำถาม Pre-test (เน้นความจำ/พื้นฐาน)
    const preTestQuestions = [
        {
            text: 'กรมใดมีหน้าที่หลักในการจัดเก็บ "ภาษีเงินได้บุคคลธรรมดา"?',
            options: ['กรมศุลกากร', 'กรมสรรพากร', 'กรมสรรพสามิต', 'สำนักงานเขต'],
            correctIndex: 1
        },
        {
            text: 'โดยปกติ "วันสุดท้าย" ของการยื่นภาษีเงินได้บุคคลธรรมดา (แบบกระดาษ) คือวันที่เท่าไหร่?',
            options: ['31 ธันวาคม', '1 มกราคม', '31 มีนาคม', '30 เมษายน'],
            correctIndex: 2
        },
        {
            text: 'พนักงานบริษัทที่มี "เงินเดือน" เพียงอย่างเดียว ต้องยื่นภาษีด้วยแบบฟอร์มใด?',
            options: ['ภ.ง.ด. 90', 'ภ.ง.ด. 91', 'ภ.ง.ด. 94', 'ภ.พ. 30'],
            correctIndex: 1
        },
        {
            text: 'ผู้มีเงินได้ "เงินเดือน" (โสด) ต้องมีรายได้ทั้งปีเกินเท่าไหร่ จึงมีหน้าที่ต้อง "ยื่น" แบบแสดงรายการภาษี?',
            options: ['60,000 บาท', '100,000 บาท', '120,000 บาท', '150,000 บาท'],
            correctIndex: 2
        },
        {
            text: 'ภาษีมูลค่าเพิ่ม (VAT) จัดอยู่ในฐานภาษีประเภทใด?',
            options: ['ฐานรายได้', 'ฐานการบริโภค', 'ฐานทรัพย์สิน', 'ฐานมรดก'],
            correctIndex: 1
        }
    ];

    // 3. สร้างคำถาม Post-test (เน้นคำนวณ/เข้าใจโครงสร้าง)
    const postTestQuestions = [
        {
            text: 'สูตรการหา "เงินได้สุทธิ" (Net Income) เพื่อนำไปคิดภาษี คือข้อใด?',
            options: [
                'รายได้ - ภาษีที่ถูกหัก ณ ที่จ่าย',
                'รายได้ - ค่าใช้จ่าย',
                'รายได้ - ค่าใช้จ่าย - ค่าลดหย่อน',
                'รายได้ + โบนัส - หนี้สิน'
            ],
            correctIndex: 2,
            timeLimit: 20
        },
        {
            text: 'ค่าใช้จ่ายสำหรับผู้มีเงินได้ประเภทที่ 1 (เงินเดือน) หักได้สูงสุดเท่าไหร่?',
            options: ['50% ไม่เกิน 100,000 บาท', '40% ไม่เกิน 60,000 บาท', '100,000 บาททั้นที', 'หักตามจริง'],
            correctIndex: 0,
            timeLimit: 25
        },
        {
            text: '"ค่าลดหย่อนส่วนตัว" (สำหรับผู้มีเงินได้ทุกคน) สามารถหักได้เท่าไหร่?',
            options: ['30,000 บาท', '60,000 บาท', '100,000 บาท', '150,000 บาท'],
            correctIndex: 1,
            timeLimit: 15
        },
        {
            text: 'อัตราภาษีเงินได้บุคคลธรรมดาของไทย เป็นรูปแบบใด?',
            options: ['อัตราคงที่ (Flat Rate)', 'อัตราก้าวหน้า (Progressive Rate)', 'อัตราถดถอย', 'เหมาจ่ายรายหัว'],
            correctIndex: 1,
            timeLimit: 15
        },
        {
            text: 'หากยื่นภาษี "เกินกำหนดเวลา" จะต้องเสียเงินเพิ่ม (Surcharge) ในอัตราร้อยละเท่าไหร่ต่อเดือน?',
            options: ['1% ต่อเดือน', '1.5% ต่อเดือน', '7% ต่อเดือน', '10% ต่อเดือน'],
            correctIndex: 1,
            timeLimit: 20
        }
    ];

    // Loop สร้างคำถามลง Database
    for (const q of preTestQuestions) {
        await Question.create({ ...q, type: 'pre-test', courseId: taxCourse._id });
    }

    for (const q of postTestQuestions) {
        await Question.create({ ...q, type: 'post-test', courseId: taxCourse._id });
    }

    console.log('✅ Seed Data Completed: Created "Personal Income Tax" Course with 10 Questions.');
    process.exit();
};

seedData();