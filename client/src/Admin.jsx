import { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { motion } from 'framer-motion';
import { Play, BarChart2, LayoutGrid, Users, Trophy } from 'lucide-react';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const socket = io(BACKEND); // (ในไฟล์ที่ใช้ socket)
const API_URL = `${BACKEND}/api`;

function Admin() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(-1);
  const [leaderboard, setLeaderboard] = useState([]);

  // 1. โหลดรายชื่อคอร์สเมื่อเปิดหน้าเว็บ
  useEffect(() => {
    axios.get(`${API_URL}/courses`).then(res => setCourses(res.data));

    // รอฟังอัปเดต Leaderboard จาก Server
    socket.on('update_leaderboard', (topUsers) => {
      setLeaderboard(topUsers);
    });

    return () => socket.off('update_leaderboard');
  }, []);

  // 2. เมื่อเลือกคอร์ส -> จอยห้อง Admin และโหลดคำถาม
  const handleSelectCourse = async (course) => {
    setSelectedCourse(course);
    // บอก Server ว่า Admin เข้าห้องคอร์สนี้แล้วนะ
    socket.emit('join_course_room', { courseId: course._id, userId: 'ADMIN' });

    // ดึงคำถาม Post-test ทั้งหมดมาเตรียมไว้ (เฉพาะข้อ Live)
    // แก้ไขให้ใช้ API ที่เราเพิ่งทำ
    try {
      const res = await axios.get(`${API_URL}/questions/${course._id}?type=post-test`);
      setQuestions(res.data);
    } catch (err) {
      console.error("Error fetching questions", err);
    }
  };

  const startQuestion = (index) => {
    // ส่งคำสั่งไป Backend
    const question = questions[index];
    if (!question) return;

    socket.emit('admin_start_question', {
      courseId: selectedCourse._id,
      questionId: question._id
    });
    setCurrentQIndex(index);
  };

  const handleExport = () => {
    window.open(`${API_URL}/admin/export-report`, '_blank');
  };

  // --- UI RENDER ---

  if (!selectedCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center p-10 bg-[#0f172a]">
        <div className="max-w-4xl w-full">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Live Controller 🎮
            </h1>
            <button
              onClick={() => window.location.href = '/?admin=dashboard'}
              className="glass-btn flex items-center gap-2 bg-white/5 border border-white/10"
            >
              <LayoutGrid size={20} /> Back to Dashboard
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(c => (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                key={c._id}
                onClick={() => handleSelectCourse(c)}
                className="glass-panel p-8 text-left hover:border-blue-500/50 transition group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-4 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
                  <Play size={24} fill="currentColor" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{c.title}</h3>
                <p className="text-gray-400 text-sm">Control live quiz session</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-white font-sans">
      {/* LEFT: Controller */}
      <div className="w-1/3 p-6 flex flex-col bg-[#1a1a2e] border-r border-white/5 relative z-10 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-200 truncate pr-4">{selectedCourse.title}</h2>
          <button onClick={() => setSelectedCourse(null)} className="text-xs text-gray-500 hover:text-white uppercase font-bold">Exit</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
          {questions.map((q, idx) => (
            <div key={q._id} className="relative group">
              <button
                onClick={() => startQuestion(idx)}
                className={`w-full p-4 rounded-xl text-left transition relative overflow-hidden ${currentQIndex === idx
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
              >
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded mb-2 inline-block ${currentQIndex === idx ? 'bg-black/20' : 'bg-white/10'}`}>Q{idx + 1}</span>
                    <p className="font-semibold text-sm line-clamp-2">{q.text}</p>
                  </div>
                  <span className="text-xs font-mono opacity-60 mt-1">{q.timeLimit}s</span>
                </div>
              </button>

              {/* Manual Timeout Button (Only visible for active question) */}
              {currentQIndex === idx && (
                <button
                  onClick={() => {
                    if (confirm('End time for this question?')) {
                      socket.emit('admin_end_question', { courseId: selectedCourse._id });
                    }
                  }}
                  className="absolute right-2 bottom-2 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded shadow z-20"
                >
                  ⏹ End Time
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <button
            onClick={handleExport}
            className="w-full glass-btn flex items-center justify-center gap-2 bg-emerald-600/80 hover:bg-emerald-600"
          >
            <BarChart2 size={20} /> Export Report
          </button>
        </div>
      </div>

      {/* RIGHT: Live Projector View */}
      <div className="w-2/3 bg-black relative overflow-hidden flex flex-col items-center justify-center p-10">
        {/* Animated Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative z-10 w-full max-w-4xl text-center">
          <h1 className="text-5xl font-black mb-12 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 drop-shadow-lg flex items-center justify-center gap-4">
            <Trophy size={64} className="text-yellow-400" /> LIVE LEADERBOARD
          </h1>

          {/* Leaderboard Chart */}
          <div className="space-y-6">
            {leaderboard.slice(0, 20).map((user, idx) => (
              <motion.div
                layout
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                key={user._id}
                className="relative"
              >
                <div className="flex justify-between items-end mb-2 px-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-black border-2 border-white/50 shadow-lg
                            ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-300' : idx === 2 ? 'bg-orange-400' : 'bg-white'}`}>
                      {idx + 1}
                    </div>
                    <span className="text-2xl font-bold">{user.nickname}</span>
                    <span className="text-sm text-gray-500 bg-white/10 px-2 py-0.5 rounded">{user.employeeId}</span>
                  </div>
                  <span className="text-2xl font-mono font-bold text-yellow-400">{user.totalScore.toLocaleString()}</span>
                </div>

                <div className="w-full bg-white/5 rounded-full h-8 overflow-hidden backdrop-blur-sm border border-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((user.totalScore / (questions.length * 1000)) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative"
                  >
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse"></div>
                  </motion.div>
                </div>
              </motion.div>
            ))}

            {leaderboard.length === 0 && (
              <div className="py-20 flex flex-col items-center opacity-50">
                <Users size={64} className="mb-4 text-gray-500" />
                <p className="text-2xl">Waiting for players...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin;
