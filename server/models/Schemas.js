const mongoose = require('mongoose');

// 1. Course Model (เพิ่ม resourceLinks)
const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  // เพิ่มส่วนนี้เพื่อเก็บลิงก์ความรู้และแอปคำนวณ
  resourceLinks: [{
    title: String,
    url: String,
    type: { type: String, enum: ['video', 'app', 'pdf', 'website'] }
  }],
  isActive: { type: Boolean, default: true },
  mode: { type: String, enum: ['pre-test', 'post-test', 'closed'], default: 'closed' },
  // Phase 3: Learning Content
  content: [{
    title: { type: String, required: true },
    body: String, // Markdown or HTML supported text
    links: [{
      title: String,
      url: String,
      type: { type: String, enum: ['video', 'link'], default: 'link' }
    }]
  }],
  createdAt: { type: Date, default: Date.now }
});

const QuestionSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  text: { type: String, required: true },
  // Unified type: we can keep it optional or just ignore it. 
  // User wants 2 rounds on SAME questions, so questions are shared.
  type: { type: String, default: 'general' },
  options: [{ type: String, required: true }],
  correctIndex: { type: Number, required: true },
  timeLimit: { type: Number, default: 20 },
  // Optional: Image for the question
  imageUrl: { type: String }
});

const UserSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  nickname: { type: String, required: true },
  currentCourseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  totalScore: { type: Number, default: 0 }
});

const ResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  isCorrect: Boolean,
  scoreEarned: Number,
  type: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = {
  Course: mongoose.model('Course', CourseSchema),
  Question: mongoose.model('Question', QuestionSchema),
  User: mongoose.model('User', UserSchema),
  Result: mongoose.model('Result', ResultSchema),
  AllowedEmployee: mongoose.model('AllowedEmployee', new mongoose.Schema({
    employeeId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
  }))
};