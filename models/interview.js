/**
 * Interview Model
 * 
 * Stores information about voice interviews conducted through Vapi.ai
 */

const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    index: true
  },
  clientName: {
    type: String,
    required: true
  },
  clientEmail: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'failed'],
    default: 'scheduled'
  },
  callId: {
    type: String,
    sparse: true
  },
  transcriptUrl: {
    type: String,
    sparse: true
  },
  audioUrl: {
    type: String,
    sparse: true
  },
  duration: {
    type: Number
  },
  scheduledTime: {
    type: Date
  },
  completedTime: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Interview', interviewSchema);
