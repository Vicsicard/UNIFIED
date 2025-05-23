/**
 * Content Model
 * 
 * Stores generated content based on transcript and style profile
 */

const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    index: true
  },
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed', 'approved'],
    default: 'processing'
  },
  contentFields: {
    type: [{
      key: String,
      value: String
    }],
    default: []
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Content', contentSchema);
