const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  read: {
    type: Boolean,
    default: false
  },
  attachment: {
    type: String, // URL to attachment if any
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Index for faster querying of conversations
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

// Index for faster querying of unread messages
messageSchema.index({ receiverId: 1, read: 1 });

module.exports = mongoose.model('Message', messageSchema); 