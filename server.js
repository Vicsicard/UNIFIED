/**
 * Unified Backend
 * 
 * This server combines functionality from:
 * - Transcript Processing
 * - Style Profiling
 * - Content Generation
 * - AI Voice Interview capability using Vapi.ai
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Set up file storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Root route - serve the HTML interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Simple API routes for demo purposes
app.post('/api/interviews', (req, res) => {
  const { clientName, clientEmail, clientPhone } = req.body;
  const clientId = `client_${Date.now()}`;
  
  console.log(`Creating interview for ${clientName} (${clientEmail})`);
  
  // In a real implementation, this would save to MongoDB
  res.json({
    success: true,
    clientId,
    message: 'Interview created successfully'
  });
});

app.post('/api/transcripts/upload', upload.single('file'), (req, res) => {
  const { clientId } = req.body;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  console.log(`File uploaded for client ${clientId}: ${file.originalname}`);
  
  // In a real implementation, this would process the file
  res.json({
    success: true,
    fileId: path.basename(file.path),
    message: 'File uploaded successfully'
  });
});

// API status route
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Unified API',
    version: '1.0.0',
    status: 'online',
    services: {
      vapi: 'ready',
      transcript: 'ready',
      style: 'ready',
      content: 'ready'
    }
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to view the application`);
});

module.exports = app;
