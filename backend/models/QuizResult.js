const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  score: {
    type: Number,
    required: true
  },
  emotion: {
    type: String,
    enum: ['happy', 'sad', 'neutral', 'angry',  'surprise'],
    required: true
  },
  presentLevel: {
    type: Number,
    required: true
  },
  nextLevel: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const userQuizSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  subtopicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject.subtopics',
    required: true
  },
  results: [quizResultSchema]
}, {
  timestamps: true
});

const UserQuiz = mongoose.model('UserQuiz', userQuizSchema);

module.exports = UserQuiz; 