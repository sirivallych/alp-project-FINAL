const mongoose = require('mongoose');

const quizInProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  subtopicId: { type: mongoose.Schema.Types.ObjectId, required: true },
  level: { type: Number, required: true },
  attempted: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
});

const QuizInProgress = mongoose.model('QuizInProgress', quizInProgressSchema);

module.exports = QuizInProgress; 