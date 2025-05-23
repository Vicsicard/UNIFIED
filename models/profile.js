/**
 * Style Profile Model
 * 
 * Stores style profile data generated from transcript analysis
 */

const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    index: true
  },
  transcriptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transcript',
    required: true
  },
  voice: {
    type: [String],
    default: []
  },
  themes: {
    type: [String],
    default: []
  },
  values: {
    type: [String],
    default: []
  },
  emotionalTone: {
    type: [String],
    default: []
  },
  relatability: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  rawProfile: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Profile', profileSchema);
