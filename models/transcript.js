/**
 * Transcript Model
 * 
 * Stores processed transcript data from interviews
 */

const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  start: {
    type: Number,
    required: true
  },
  end: {
    type: Number,
    required: true
  },
  audioPath: {
    type: String
  },
  videoPath: {
    type: String
  },
  embedding: {
    type: [Number]
  }
});

const transcriptSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    index: true
  },
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    sparse: true
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  sourceType: {
    type: String,
    enum: ['vapi', 'upload', 'manual'],
    required: true
  },
  sourceUrl: {
    type: String
  },
  chunks: [chunkSchema],
  rawText: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transcript', transcriptSchema);
