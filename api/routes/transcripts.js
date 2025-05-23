/**
 * Transcript Routes
 * 
 * Handles API endpoints for managing transcripts
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Transcript = require('../../models/transcript');
const transcriptService = require('../../services/transcript/transcript-service');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/transcripts');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp4', '.m4a', '.mp3', '.wav', '.vtt', '.srt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio, video, and subtitle files are allowed.'));
    }
  }
});

// Get all transcripts
router.get('/', async (req, res) => {
  try {
    const transcripts = await Transcript.find().sort({ createdAt: -1 });
    res.json(transcripts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transcript by ID
router.get('/:id', async (req, res) => {
  try {
    const transcript = await Transcript.findById(req.params.id);
    
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    res.json(transcript);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload and process a new transcript
router.post('/upload', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'subtitle', maxCount: 1 }
]), async (req, res) => {
  try {
    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Create a new transcript record
    const transcript = new Transcript({
      clientId,
      sourceType: 'upload',
      status: 'processing'
    });
    
    await transcript.save();
    
    // Process the transcript asynchronously
    transcriptService.processUploadedFiles(transcript._id, req.files)
      .then(async (result) => {
        // Update the transcript with the processed data
        transcript.chunks = result.chunks;
        transcript.status = 'completed';
        transcript.metadata = result.metadata;
        await transcript.save();
      })
      .catch(async (error) => {
        console.error('Transcript processing failed:', error);
        transcript.status = 'failed';
        transcript.metadata = { error: error.message };
        await transcript.save();
      });
    
    // Return the transcript ID immediately
    res.status(202).json({
      message: 'Transcript processing started',
      transcriptId: transcript._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transcript chunks
router.get('/:id/chunks', async (req, res) => {
  try {
    const transcript = await Transcript.findById(req.params.id);
    
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    res.json(transcript.chunks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transcript status
router.get('/:id/status', async (req, res) => {
  try {
    const transcript = await Transcript.findById(req.params.id, 'status');
    
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    res.json({ status: transcript.status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a transcript
router.delete('/:id', async (req, res) => {
  try {
    const transcript = await Transcript.findByIdAndDelete(req.params.id);
    
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    res.json({ message: 'Transcript deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
