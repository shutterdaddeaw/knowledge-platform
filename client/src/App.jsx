import { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogIn, Award, PlayCircle, CheckCircle, Smartphone, X, BookOpen } from 'lucide-react';
import Admin from './Admin';
import AdminDashboard from './AdminDashboard';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const socket = io(BACKEND); // (ในไฟล์ที่ใช้ socket)
const API_URL = `${BACKEND}/api`;

function App() {
  // Simple URL parameter routing for demo purposes (or use react-router in real app)
  const urlParams = new URLSearchParams(window.location.search);
  const isAdmin = urlParams.get('admin');

  if (isAdmin === 'true' || isAdmin === 'dashboard') return <AdminDashboard />;
  if (isAdmin === 'live') return <Admin />;

  // --- USER STATE ---
  const [step, setStep] = useState('LOGIN');
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [preTestQuestions, setPreTestQuestions] = useState([]);
  const [preTestAnswers, setPreTestAnswers] = useState({});
  const [liveQuestion, setLiveQuestion] = useState(null);
  const [liveResult, setLiveResult] = useState(null);
  const [viewTab, setViewTab] = useState('STUDY'); // STUDY | TEST
  const [isTimeUp, setIsTimeUp] = useState(false); // Track if time is up

  // --- SOCKET ---
  useEffect(() => {
    socket.on('receive_question', (question) => {
      setLiveQuestion(question);
      setLiveResult(null);
      setIsTimeUp(false); // Reset time up state
      setStep('LIVE_QUIZ');
    });

    socket.on('question_timeout', () => {
      setIsTimeUp(true);
    });

    socket.on('answer_result', (result) => {
      setLiveResult(result);
      setStep('RESULT');
    });

    return () => {
      socket.off('receive_question');
      socket.off('answer_result');
      socket.off('question_timeout');
    };
  }, []);

  // --- HANDLERS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const nickname = e.target.nickname.value;
    const employeeId = e.target.employeeId.value;

    try {
      // First, just check if we can fetch courses (which confirms basic connectivity)
      // But actually, let's just proceed. The real check happens on Join.
      // Wait, user asked to check ID *before* entering system? 
      // Current API checks on "Join Course". Ideally we should check on Login.
      // Let's create a quick valid check or just rely on the Join Step?
      // Request: "In part User Login... check Employee id from system first"
      // So I should probably add a verify endpoint or just do it.
      // Let's modify the flow: We assume Login is local state, but let's just verify via a quick call if we want strictness.
      // Actually, standard pattern here is just store user state, and verify later. 
      // BUT requirement says "Check before entering".
      // Let's add a lightweight verify call or just check when fetching courses? 
      // I'll add a simple "login" endpoint to server? 
      // Or just use the "join-course" logic later? 
      // Let's try to verify via a new specific endpoint OR just catch it at Join Course.
      // User said: "Login... check Employee id". I will add a verify step.

      // Let's add a temporary verify call by trying to 'join' a dummy or just checking existence?
      // Actually, let's just assume we store it, and if they fail to join ANY course, it's bad.
      // BUT, to follow "Check before usage", I'll add a verify call. 
      // Since I didn't plan a specific correct `/api/login` endpoint, I will use `POST /api/join-course` as the gatekeeper later.
      // User requirement: "Check from system info BEFORE usage". 
      // I will add a simple check: `GET /api/check-employee/:id` (need to add to server) OR just use the existing flow and fail fast?
      // Let's add `POST /api/login` to server.js quickly? No, I'll stick to client changes first.

      // I will just fetch courses. If that works, we show course list.
      // The requirement "Check Employee ID from system first" -> imply I should not even show courses if ID is invalid.
      // So I'll just do a "validate" call. I'll reuse `join-course`? No.
      // I'll use `POST /api/courses`? No.

      // I will add `POST /api/auth/login` to server.js in next step? 
      // For now, I will modify `handleLogin` to just set state, but `handleSelectCourse` will fail. 
      // Wait, "Check... before enter system". 
      // OK, I'll add the server route for `POST /api/validate-user` in the next tool call, then use it here.

      const res = await axios.post(`${API_URL}/validate-user`, { employeeId });
      if (!res.data.valid) throw new Error('Invalid Employee ID');

      setUser({ nickname, employeeId });
      const coursesRes = await axios.get(`${API_URL}/courses`);
      setCourses(coursesRes.data);
      setStep('SELECT_COURSE');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        alert('❌ Access Denied: Employee ID not found in system.');
      } else if (err.message === 'Invalid Employee ID') {
        alert('❌ Access Denied: Employee ID not found in system.');
      } else {
        alert('Cannot connect to server or invalid data.');
      }
    }
  };

  const handleSelectCourse = async (course) => {
    // Check mode
    if (course.mode === 'closed') {
      alert('This course is currently closed.');
      return;
    }

    setSelectedCourse(course);

    // Join logic with ID Check
    try {
      const res = await axios.post(`${API_URL}/join-course`, {
        employeeId: user.employeeId,
        nickname: user.nickname,
        courseId: course._id
      });
      setUser(res.data);
      socket.emit('join_course_room', { courseId: course._id, userId: res.data._id });

      if (course.mode === 'pre-test') {
        const qRes = await axios.get(`${API_URL}/pre-test/${course._id}`);
        setPreTestQuestions(qRes.data);
        setViewTab('STUDY');
        setStep('COURSE_VIEW');
      } else {
        // Post-test means live lobby
        setViewTab('STUDY');
        setStep('COURSE_VIEW');
      }
    } catch (err) {
      if (err.response && err.response.status === 403) {
        alert('❌ Access Denied: Employee ID not found.');
        setStep('LOGIN'); // Returns to login
      } else {
        alert('Error joining course.');
      }
    }
  };

  const handleSubmitPreTest = async () => {
    if (!user || !selectedCourse) return;

    // Convert answers object to array format expected by backend
    // preTestAnswers is { questionId: optionIndex }
    const answersArray = Object.entries(preTestAnswers).map(([qId, optIdx]) => ({
      questionId: qId,
      selectedOptionIndex: optIdx
    }));

    // Check if all questions are answered (Optional, but good UX)
    if (answersArray.length < preTestQuestions.length) {
      if (!confirm('You haven\'t answered all questions. Submit anyway?')) return;
    }

    try {
      const res = await axios.post(`${API_URL}/submit-pretest`, {
        userId: user._id,
        courseId: selectedCourse._id,
        answers: answersArray
      });

      if (res.data.success) {
        alert(`Answers submitted successfully! Score: ${res.data.totalScore}`);
        setViewTab('STUDY');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting answers. Please try again.');
    }
  };

  const submitLiveAnswer = (index) => {
    if (!liveQuestion || isTimeUp) return;
    socket.emit('submit_answer', {
      questionId: liveQuestion._id,
      answerIndex: index,
      clientStartTime: liveQuestion.startTime
    });
  };

  // --- ANIMATION VARIANTS ---
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen flex justify-center items-center p-4">
      <div className="w-full max-w-md relative z-10">

        {/* Header / User Info */}
        <div className="flex justify-between items-center mb-6 px-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Smartphone className="text-white" size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight">PRM:Course&Quiz</span>
          </div>
          {user && (
            <div className="glass-panel px-3 py-1 flex items-center gap-2 rounded-full text-sm font-medium">
              <User size={14} className="text-blue-400" /> {user.nickname}
            </div>
          )}
        </div>

        {/* Main Card */}
        <div className="glass-panel p-1 min-h-[500px] flex flex-col relative overflow-hidden">

          {/* Internal Content Padding */}
          <div className="p-6 flex-1 flex flex-col">
            <AnimatePresence mode='wait'>

              {/* 1. LOGIN */}
              {step === 'LOGIN' && (
                <motion.div key="login" variants={pageVariants} initial="initial" animate="in" exit="out" className="flex-1 flex flex-col justify-center">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Welcome Back</h2>
                    <p className="text-gray-400">Ready to test your knowledge?</p>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-500 font-bold ml-1 uppercase">Employee ID</label>
                      <input name="employeeId" required className="glass-input mt-1" placeholder="Ex. 101" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-bold ml-1 uppercase">Nickname</label>
                      <input name="nickname" required className="glass-input mt-1" placeholder="Ex. Tony" />
                    </div>
                    <button type="submit" className="glass-btn w-full mt-4 shadow-blue-500/20">
                      START <LogIn size={18} className="inline ml-1" />
                    </button>
                  </form>
                </motion.div>
              )}

              {/* 2. SELECT COURSE */}
              {step === 'SELECT_COURSE' && (
                <motion.div key="select" variants={pageVariants} initial="initial" animate="in" exit="out" className="space-y-4">
                  <h2 className="text-2xl font-bold text-center mb-6">Select Course</h2>
                  {courses.map(course => (
                    <motion.div whileHover={{ scale: 1.02 }} key={course._id} className="glass-panel p-5 cursor-pointer border-white/5 hover:border-blue-400/50 transition">
                      <h3 className="font-bold text-lg text-blue-300 mb-1">{course.title}</h3>
                      <p className="text-sm text-gray-400 mb-4">{course.description}</p>

                      {course.resourceLinks?.length > 0 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                          {course.resourceLinks.map((link, idx) => (
                            <a key={idx} href={link.url} target="_blank" className="text-xs bg-white/5 px-2 py-1 rounded hover:bg-white/10 flex items-center gap-1 whitespace-nowrap">
                              {link.type === 'video' ? '📺' : '🔗'} {link.title}
                            </a>
                          ))}
                        </div>
                      )}

                      <button onClick={() => handleSelectCourse(course)} className="w-full py-2 rounded-lg bg-blue-600/20 text-blue-300 font-semibold hover:bg-blue-600 hover:text-white transition">
                        Join Class
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* 3. COURSE VIEW (Study vs Test) */}
              {step === 'COURSE_VIEW' && selectedCourse && (
                <motion.div key="course_view" variants={pageVariants} initial="initial" animate="in" exit="out" className="flex flex-col h-full">
                  <div className="flex gap-2 mb-4 bg-black/20 p-1 rounded-xl">
                    <button
                      onClick={() => setViewTab('STUDY')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${viewTab === 'STUDY' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                      📖 Study
                    </button>
                    <button
                      onClick={() => setViewTab('TEST')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${viewTab === 'TEST' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                      📝 Test / Quiz
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {/* STUDY TAB */}
                    {viewTab === 'STUDY' && (
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">{selectedCourse.title}</h2>
                          <p className="text-gray-400 text-sm mt-2">{selectedCourse.description}</p>
                        </div>

                        {(selectedCourse.content && selectedCourse.content.length > 0) ? (
                          selectedCourse.content.map((chapter, idx) => (
                            <div key={idx} className="glass-panel p-5 bg-white/5 border border-white/10">
                              <h3 className="font-bold text-lg text-blue-200 mb-3 border-b border-white/10 pb-2 flex items-center gap-2">
                                <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded">Part {idx + 1}</span>
                                {chapter.title}
                              </h3>
                              <div className="text-gray-300 text-sm whitespace-pre-line leading-relaxed mb-4">
                                {chapter.body}
                              </div>
                              {chapter.links && chapter.links.length > 0 && (
                                <div className="grid gap-2">
                                  {chapter.links.map((link, lIdx) => (
                                    link.url.includes('youtube.com') || link.url.includes('youtu.be') ? (
                                      <div key={lIdx} className="rounded-lg overflow-hidden border border-white/10 mt-2">
                                        <iframe
                                          width="100%"
                                          height="200"
                                          src={`https://www.youtube.com/embed/${link.url.split('v=')[1] ? link.url.split('v=')[1].split('&')[0] : link.url.split('/').pop()}`}
                                          title={link.title}
                                          frameBorder="0"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                        ></iframe>
                                        <div className="bg-black/40 p-2 text-xs text-gray-400 flex items-center gap-2">
                                          <span>📺 {link.title || 'Video Resource'}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <a key={lIdx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition group">
                                        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600 transition">
                                          <BookOpen size={14} className="text-blue-300 group-hover:text-white" />
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-bold text-sm text-blue-200">{link.title || 'External Link'}</div>
                                          <div className="text-xs text-gray-500 truncate">{link.url}</div>
                                        </div>
                                      </a>
                                    )
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 text-gray-500">
                            <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No study content available yet.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TEST TAB */}
                    {viewTab === 'TEST' && (
                      <>
                        {selectedCourse.mode === 'pre-test' && (
                          <div className="flex flex-col h-full">
                            <h2 className="text-xl font-bold text-center mb-4 flex items-center justify-center gap-2">
                              <BookOpen size={20} className="text-yellow-400" /> Pre-test
                            </h2>
                            <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                              {preTestQuestions.map((q, idx) => (
                                <div key={q._id} className="glass-panel p-4 bg-black/20">
                                  <p className="font-semibold mb-3 text-gray-200">{idx + 1}. {q.text}</p>
                                  <div className="space-y-2">
                                    {q.options.map((opt, optIdx) => (
                                      <label key={optIdx} className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition ${preTestAnswers[q._id] === optIdx ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10'}`}>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${preTestAnswers[q._id] === optIdx ? 'border-white' : 'border-gray-500'}`}>
                                          {preTestAnswers[q._id] === optIdx && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                        </div>
                                        <span className="text-sm">{opt}</span>
                                        {/* Hidden Radio for logic */}
                                        <input type="radio" name={q._id} className="hidden" onChange={() => setPreTestAnswers({ ...preTestAnswers, [q._id]: optIdx })} />
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button onClick={handleSubmitPreTest} className="glass-btn w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600">
                              Submit Answers
                            </button>
                          </div>
                        )}

                        {selectedCourse.mode === 'post-test' && (
                          <div className="flex-1 flex flex-col justify-center items-center text-center">
                            <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 relative">
                              <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                              <PlayCircle size={48} className="text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Waiting for Host</h2>
                            <p className="text-gray-400">The instructor will start the quiz shortly.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {/* 5. LIVE QUIZ */}
              {step === 'LIVE_QUIZ' && liveQuestion && (
                <motion.div key="live" variants={pageVariants} initial="initial" animate="in" exit="out" className="flex-1 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-6">
                    <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold animate-pulse">LIVE</span>
                    <span className="font-mono text-xl font-bold text-yellow-400">{liveQuestion.timeLimit}s</span>
                  </div>

                  <h2 className="text-xl font-bold text-center mb-8 leading-relaxed">{liveQuestion.text}</h2>

                  <div className="grid grid-cols-1 gap-3 flex-1 content-center">
                    {liveQuestion.options.map((opt, index) => (
                      <motion.button
                        key={index}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => submitLiveAnswer(index)}
                        className={`min-h-[80px] p-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-start text-left transition-all
                          ${index === 0 ? 'bg-red-500 hover:bg-red-400' :
                            index === 1 ? 'bg-blue-500 hover:bg-blue-400' :
                              index === 2 ? 'bg-yellow-500 hover:bg-yellow-400' :
                                'bg-green-500 hover:bg-green-400'}
                        `}
                      >
                        <div className="bg-black/20 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm flex-shrink-0">
                          {['A', 'B', 'C', 'D'][index]}
                        </div>
                        <span className="text-sm md:text-base leading-tight">{opt}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Time's Up Overlay */}
                  {isTimeUp && (
                    <div className="mt-4 text-center">
                      <h2 className="text-2xl font-bold text-red-500 animate-bounce">⏰ Time's Up!</h2>
                      <p className="text-gray-400">Waiting for next question...</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* 6. RESULT */}
              {step === 'RESULT' && liveResult && (
                <motion.div key="result" variants={pageVariants} initial="initial" animate="in" exit="out" className="flex-1 flex flex-col justify-center items-center text-center">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ type: "spring" }}
                    className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-2xl ${liveResult.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}
                  >
                    {liveResult.isCorrect ? <CheckCircle size={64} className="text-white" /> : <X size={64} className="text-white" />}
                  </motion.div>

                  <h2 className="text-4xl font-extrabold mb-2">{liveResult.isCorrect ? 'Awesome!' : 'Oops!'}</h2>
                  <p className="text-xl text-gray-300 mb-8 max-w-[200px] mx-auto">
                    {liveResult.isCorrect ? `You got +${liveResult.score} points` : 'Better luck next time'}
                  </p>

                  <div className="animate-bounce text-gray-500 flex flex-col items-center">
                    <span className="text-xs uppercase tracking-widest mb-2">Next Question</span>
                    <Award size={24} />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
