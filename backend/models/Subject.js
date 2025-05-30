const mongoose = require('mongoose');

const subtopicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
 
  generated: {
    type: Boolean,
    default: false
  }
});

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  subtopics: [subtopicSchema]
}, { 
  timestamps: true
});

module.exports = mongoose.model('Subject', subjectSchema); 