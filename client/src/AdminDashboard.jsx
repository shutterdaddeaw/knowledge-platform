import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Save, X, BookOpen, HelpCircle, LayoutDashboard, Download } from 'lucide-react';

const API_URL = 'http://localhost:3000/api';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('courses'); // courses | questions | employees | analysis
    const [courses, setCourses] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [analysisData, setAnalysisData] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(null);

    // Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // If null, adding new
    const [formData, setFormData] = useState({});

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        if (activeTab === 'questions' && selectedCourseId) {
            fetchQuestions(selectedCourseId);
        } else if (activeTab === 'employees') {
            fetchEmployees();
        } else if (activeTab === 'analysis' && selectedCourseId) {
            fetchAnalysis(selectedCourseId);
        }
    }, [activeTab, selectedCourseId]);

    const fetchCourses = async () => {
        const res = await axios.get(`${API_URL}/admin/courses`);
        setCourses(res.data);
        if (!selectedCourseId && res.data.length > 0) {
            setSelectedCourseId(res.data[0]._id);
        }
    };

    const fetchQuestions = async (courseId) => {
        const res = await axios.get(`${API_URL}/questions/${courseId}?type=post-test`);
        setQuestions(res.data);
    };

    const fetchEmployees = async () => {
        const res = await axios.get(`${API_URL}/admin/employees`);
        setEmployees(res.data);
    };

    const fetchAnalysis = async (courseId) => {
        const res = await axios.get(`${API_URL}/admin/comparison/${courseId}`);
        setAnalysisData(res.data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (activeTab === 'courses') {
                const payload = { ...formData };
                if (editingItem) {
                    await axios.put(`${API_URL}/courses/${editingItem._id}`, payload);
                } else {
                    await axios.post(`${API_URL}/courses`, payload);
                }
                fetchCourses();
            } else if (activeTab === 'questions') {
                const payload = {
                    ...formData,
                    courseId: selectedCourseId,
                    type: 'post-test',
                    // Create options array from individual fields
                    options: [
                        formData.option0,
                        formData.option1,
                        formData.option2,
                        formData.option3
                    ]
                };
                if (editingItem) {
                    await axios.put(`${API_URL}/questions/${editingItem._id}`, payload);
                } else {
                    await axios.post(`${API_URL}/questions`, payload);
                }
                fetchQuestions(selectedCourseId);
            } else if (activeTab === 'employees') {
                // Bulk add support (split by newline or comma)
                const ids = formData.employeeId.split(/[\n,]+/).map(id => id.trim()).filter(id => id);
                let addedCount = 0;
                let errorCount = 0;
                for (let id of ids) {
                    try {
                        await axios.post(`${API_URL}/admin/employees`, { employeeId: id });
                        addedCount++;
                    } catch (e) {
                        // Likely duplicate, ignore
                        errorCount++;
                    }
                }
                fetchEmployees();
                if (errorCount > 0) alert(`Added ${addedCount} employees. Skipped ${errorCount} duplicates/errors.`);
            }
            setIsModalOpen(false);
            setEditingItem(null);
            setFormData({});
        } catch (err) {
            console.error(err);
            alert('Error saving data');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await axios.delete(`${API_URL}/${activeTab === 'employees' ? 'admin/employees' : activeTab}/${id}`);
            if (activeTab === 'courses') fetchCourses();
            else if (activeTab === 'questions') fetchQuestions(selectedCourseId);
            else if (activeTab === 'employees') fetchEmployees();
        } catch (err) {
            console.error(err);
            alert('Error deleting');
        }
    };

    const openModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            if (activeTab === 'questions') {
                setFormData({
                    ...item,
                    option0: item.options[0] || '',
                    option1: item.options[1] || '',
                    option2: item.options[2] || '',
                    option3: item.options[3] || '',
                });
            } else {
                setFormData(item);
            }
        } else {
            if (activeTab === 'courses') setFormData({ title: '', description: '', isActive: true });
            else if (activeTab === 'questions') setFormData({ text: '', option0: '', option1: '', option2: '', option3: '', correctIndex: 0, timeLimit: 20 });
            else if (activeTab === 'employees') setFormData({ employeeId: '' });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen text-white p-8">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-3">
                        <LayoutDashboard className="w-10 h-10 text-blue-400" />
                        Admin Dashboard
                    </h1>
                    <div className="flex gap-4">
                        <button
                            onClick={() => window.location.href = '/?admin=live'}
                            className="glass-btn bg-white/5 border border-white/20 hover:bg-white/10"
                        >
                            🔴 Go to Live Controller
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    {['courses', 'questions', 'employees', 'analysis'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`capitalize flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === tab ? 'bg-blue-600 shadow-lg scale-105' : 'glass-panel hover:bg-white/5'}`}
                        >
                            {tab === 'courses' && <BookOpen size={20} />}
                            {tab === 'questions' && <HelpCircle size={20} />}
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Courses List */}
                {activeTab === 'courses' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <button
                            onClick={() => openModal()}
                            className="glass-panel min-h-[200px] flex flex-col items-center justify-center border-dashed border-2 border-gray-600 hover:border-blue-400 hover:bg-white/5 transition group"
                        >
                            <div className="p-4 rounded-full bg-blue-600/20 group-hover:bg-blue-600/40 transition mb-4">
                                <Plus size={32} className="text-blue-400" />
                            </div>
                            <span className="font-bold text-gray-400 group-hover:text-white">Add New Course</span>
                        </button>

                        {courses.map(course => (
                            <div key={course._id} className="glass-panel p-6 relative group hover:border-blue-500/50 transition">
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => openModal(course)} className="p-2 hover:bg-white/10 rounded-lg text-yellow-400"><Edit2 size={18} /></button>
                                    <button onClick={() => handleDelete(course._id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400"><Trash2 size={18} /></button>
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-white">{course.title}</h3>
                                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                                <div className="flex gap-2">
                                    <span className={`text-xs px-2 py-1 rounded ${course.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {course.isActive ? 'Public' : 'Hidden'}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded border ${course.mode === 'pre-test' ? 'border-green-500 text-green-400' :
                                        course.mode === 'post-test' ? 'border-red-500 text-red-400' :
                                            'border-gray-500 text-gray-500'
                                        }`}>
                                        Mode: {course.mode || 'Closed'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* Questions List */}
                {activeTab === 'questions' && (
                    <div className="flex gap-6">
                        {/* Sidebar Course Select */}
                        <div className="w-1/4 glass-panel p-4 h-fit">
                            <h3 className="font-bold text-gray-400 mb-4 px-2 uppercase text-xs">Select Course</h3>
                            <div className="space-y-2">
                                {courses.map(course => (
                                    <button
                                        key={course._id}
                                        onClick={() => setSelectedCourseId(course._id)}
                                        className={`w-full text-left p-3 rounded-lg transition ${selectedCourseId === course._id ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-white/5 text-gray-400'}`}
                                    >
                                        <div className="font-semibold truncate">{course.title}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Questions Grid */}
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Questions ({questions.length})</h2>
                                <button onClick={() => openModal()} className="glass-btn flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600">
                                    <Plus size={20} /> Add Question
                                </button>
                            </div>

                            <div className="space-y-4">
                                {questions.map((q, idx) => (
                                    <motion.div
                                        key={q._id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="glass-panel p-4 flex justify-between items-center group"
                                    >
                                        <div className="flex gap-4 items-center">
                                            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-gray-400">
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <p className="font-semibold text-lg">{q.text}</p>
                                                <div className="flex gap-2 mt-2">
                                                    {q.options.map((opt, i) => (
                                                        <span key={i} className={`text-xs px-2 py-1 rounded ${i === q.correctIndex ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-500'}`}>
                                                            {opt}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 opacity-50 group-hover:opacity-100 transition">
                                            <div className="text-center">
                                                <span className="block text-xs text-gray-500">Time</span>
                                                <span className="font-mono">{q.timeLimit}s</span>
                                            </div>
                                            <div className="flex gap-1 border-l border-white/10 pl-4">
                                                <button onClick={() => openModal(q)} className="p-2 hover:bg-white/10 rounded-lg text-yellow-400"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDelete(q._id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400"><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Employees List */}
                {activeTab === 'employees' && (
                    <div className="glass-panel p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Allowed Employees ({employees.length})</h2>
                            <div className="flex gap-2">
                                <label className="glass-btn flex items-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 cursor-pointer">
                                    <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        const text = await file.text();
                                        const rows = text.split(/\r?\n/).map(r => r.trim()).filter(r => r);
                                        const ids = [];
                                        rows.forEach(row => {
                                            const cols = row.split(',');
                                            if (cols[0] && cols[0] !== 'employeeId') ids.push(cols[0].trim());
                                        });

                                        if (ids.length > 0) {
                                            if (!confirm(`Import ${ids.length} employees?`)) return;
                                            let added = 0;
                                            for (let id of ids) {
                                                try {
                                                    await axios.post(`${API_URL}/admin/employees`, { employeeId: id });
                                                    added++;
                                                } catch (e) { }
                                            }
                                            fetchEmployees();
                                            alert(`Imported ${added} successfully!`);
                                        }
                                    }} />
                                    <Plus size={20} /> Import CSV
                                </label>
                                <button onClick={() => openModal()} className="glass-btn flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600">
                                    <Plus size={20} /> Add Manually
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60rem] overflow-y-auto">
                            {employees.map(emp => (
                                <div key={emp._id} className="p-3 bg-white/5 rounded-lg flex justify-between items-center group">
                                    <span className="font-mono font-bold text-blue-300">{emp.employeeId}</span>
                                    <button onClick={() => handleDelete(emp._id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:bg-white/10 p-1 rounded transition">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Analysis Report */}
                {activeTab === 'analysis' && (
                    <div className="flex gap-6">
                        {/* Sidebar Course Select (Reuse) */}
                        <div className="w-1/4 glass-panel p-4 h-fit">
                            <h3 className="font-bold text-gray-400 mb-4 px-2 uppercase text-xs">Select Course</h3>
                            <div className="space-y-2">
                                {courses.map(course => (
                                    <button
                                        key={course._id}
                                        onClick={() => setSelectedCourseId(course._id)}
                                        className={`w-full text-left p-3 rounded-lg transition ${selectedCourseId === course._id ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-white/5 text-gray-400'}`}
                                    >
                                        <div className="font-semibold truncate">{course.title}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 glass-panel p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Score Comparison</h2>
                                <button
                                    onClick={() => window.open(`${API_URL}/admin/export-report?courseId=${selectedCourseId}`, '_blank')}
                                    className="glass-btn bg-green-600 hover:bg-green-500 flex items-center gap-2"
                                >
                                    <Download size={18} /> Export Excel (Detailed)
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="p-3 rounded-tl-lg">ID</th>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Pre-test</th>
                                            <th className="p-3">Post-test</th>
                                            <th className="p-3 rounded-tr-lg">Improvement</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analysisData.map((row, i) => (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="p-3 font-mono">{row.employeeId}</td>
                                                <td className="p-3">{row.nickname}</td>
                                                <td className="p-3">{row.preScore}</td>
                                                <td className="p-3">{row.postScore}</td>
                                                <td className="p-3 font-bold text-green-400">{row.improvement}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal */}
                <AnimatePresence>
                    {isModalOpen && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                                className="glass-panel w-full max-w-lg p-6 relative bg-[#1a1a2e]"
                            >
                                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X /></button>
                                <h2 className="text-2xl font-bold mb-6">{editingItem ? 'Edit' : 'Create'} {activeTab.slice(0, -1)}</h2>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {activeTab === 'courses' ? (
                                        <>
                                            <div>
                                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                                <input className="glass-input" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                                <textarea className="glass-input min-h-[80px]" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                            </div>

                                            {/* Content Management Section */}
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <label className="block text-sm text-blue-300 font-bold uppercase">Course Content (Chapters)</label>
                                                    <button type="button" onClick={() => {
                                                        const newContent = [...(formData.content || [])];
                                                        newContent.push({ title: 'New Chapter', body: '', links: [] });
                                                        setFormData({ ...formData, content: newContent });
                                                    }} className="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-500 transition">+ Add Chapter</button>
                                                </div>

                                                {(formData.content || []).map((chapter, cIdx) => (
                                                    <div key={cIdx} className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                        <div className="flex justify-between mb-2">
                                                            <input
                                                                className="bg-transparent border-b border-white/20 text-sm font-bold w-2/3 focus:outline-none focus:border-blue-400"
                                                                value={chapter.title}
                                                                placeholder="Chapter Title"
                                                                onChange={e => {
                                                                    const newContent = [...formData.content];
                                                                    newContent[cIdx].title = e.target.value;
                                                                    setFormData({ ...formData, content: newContent });
                                                                }}
                                                            />
                                                            <button type="button" onClick={() => {
                                                                const newContent = formData.content.filter((_, i) => i !== cIdx);
                                                                setFormData({ ...formData, content: newContent });
                                                            }} className="text-red-400 text-xs hover:underline">Remove</button>
                                                        </div>
                                                        <textarea
                                                            className="w-full bg-white/5 rounded p-2 text-xs min-h-[60px] mb-2 text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                            placeholder="Chapter content body..."
                                                            value={chapter.body || ''}
                                                            onChange={e => {
                                                                const newContent = [...formData.content];
                                                                newContent[cIdx].body = e.target.value;
                                                                setFormData({ ...formData, content: newContent });
                                                            }}
                                                        />

                                                        {/* Links within Chapter */}
                                                        <div className="pl-2 border-l-2 border-white/10">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[10px] uppercase text-gray-500">Links / Resources</span>
                                                                <button type="button" onClick={() => {
                                                                    const newContent = [...formData.content];
                                                                    newContent[cIdx].links = [...(newContent[cIdx].links || []), { title: '', url: '' }];
                                                                    setFormData({ ...formData, content: newContent });
                                                                }} className="text-[10px] text-blue-400 hover:text-blue-300">+ Link</button>
                                                            </div>
                                                            {(chapter.links || []).map((link, lIdx) => (
                                                                <div key={lIdx} className="flex gap-2 mb-1">
                                                                    <input
                                                                        className="bg-white/5 rounded px-2 py-1 text-xs w-1/3"
                                                                        placeholder="Title"
                                                                        value={link.title}
                                                                        onChange={e => {
                                                                            const newContent = [...formData.content];
                                                                            newContent[cIdx].links[lIdx].title = e.target.value;
                                                                            setFormData({ ...formData, content: newContent });
                                                                        }}
                                                                    />
                                                                    <input
                                                                        className="bg-white/5 rounded px-2 py-1 text-xs flex-1"
                                                                        placeholder="URL (YouTube/Web)"
                                                                        value={link.url}
                                                                        onChange={e => {
                                                                            const newContent = [...formData.content];
                                                                            newContent[cIdx].links[lIdx].url = e.target.value;
                                                                            setFormData({ ...formData, content: newContent });
                                                                        }}
                                                                    />
                                                                    <button type="button" onClick={() => {
                                                                        const newContent = [...formData.content];
                                                                        newContent[cIdx].links = newContent[cIdx].links.filter((_, i) => i !== lIdx);
                                                                        setFormData({ ...formData, content: newContent });
                                                                    }} className="text-red-400 text-xs px-1">x</button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div>
                                                <label className="block text-sm text-gray-400 mb-1">Status / Mode</label>
                                                <select className="glass-input" value={formData.mode || 'closed'} onChange={e => setFormData({ ...formData, mode: e.target.value })}>
                                                    <option value="closed">Closed (Inactive)</option>
                                                    <option value="pre-test">🟢 Pre-test Mode (Self-paced)</option>
                                                    <option value="post-test">🔴 Post-test Mode (Live Logic)</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                                                <label>Is Publicly Visible?</label>
                                            </div>
                                        </>
                                    ) : activeTab === 'questions' ? (
                                        <>
                                            <div>
                                                <label className="block text-sm text-gray-400 mb-1">Question Text</label>
                                                <input className="glass-input" value={formData.text || ''} onChange={e => setFormData({ ...formData, text: e.target.value })} required />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Option A</label>
                                                    <input className="glass-input" value={formData.option0 || ''} onChange={e => setFormData({ ...formData, option0: e.target.value })} required />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Option B</label>
                                                    <input className="glass-input" value={formData.option1 || ''} onChange={e => setFormData({ ...formData, option1: e.target.value })} required />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Option C</label>
                                                    <input className="glass-input" value={formData.option2 || ''} onChange={e => setFormData({ ...formData, option2: e.target.value })} required />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Option D</label>
                                                    <input className="glass-input" value={formData.option3 || ''} onChange={e => setFormData({ ...formData, option3: e.target.value })} required />
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-sm text-gray-400 mb-1">Correct Answer</label>
                                                    <select
                                                        className="glass-input"
                                                        value={formData.correctIndex}
                                                        onChange={e => setFormData({ ...formData, correctIndex: parseInt(e.target.value) })}
                                                    >
                                                        <option value={0}>Option A</option>
                                                        <option value={1}>Option B</option>
                                                        <option value={2}>Option C</option>
                                                        <option value={3}>Option D</option>
                                                    </select>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-sm text-gray-400 mb-1">Time Limit (s)</label>
                                                    <input type="number" className="glass-input" value={formData.timeLimit || 20} onChange={e => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })} />
                                                </div>
                                            </div>
                                        </>
                                    ) : activeTab === 'employees' ? (
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Employee IDs (one per line or comma separated)</label>
                                            <textarea
                                                className="glass-input min-h-[150px]"
                                                value={formData.employeeId || ''}
                                                onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                                                placeholder="EMP001, EMP002, EMP003..."
                                                required
                                            />
                                        </div>
                                    ) : null}

                                    <button type="submit" className="glass-btn w-full mt-6 justify-center flex items-center gap-2">
                                        <Save size={18} /> Save Changes
                                    </button>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
