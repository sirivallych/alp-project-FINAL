const mongoose = require('mongoose');

const therapistAssignmentSchema = new mongoose.Schema({
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Create a compound index to ensure unique therapist-user pairs
therapistAssignmentSchema.index({ therapistId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('TherapistAssignment', therapistAssignmentSchema); 