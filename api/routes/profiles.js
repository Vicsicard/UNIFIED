/**
 * Profile Routes
 * 
 * Handles API endpoints for managing style profiles
 */

const express = require('express');
const router = express.Router();
const Profile = require('../../models/profile');
const Transcript = require('../../models/transcript');
const styleService = require('../../services/style/style-service');

// Get all profiles
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().sort({ createdAt: -1 });
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile by ID
router.get('/:id', async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate a profile from a transcript
router.post('/generate', async (req, res) => {
  try {
    const { transcriptId } = req.body;
    
    if (!transcriptId) {
      return res.status(400).json({ error: 'Transcript ID is required' });
    }
    
    // Check if transcript exists and is completed
    const transcript = await Transcript.findById(transcriptId);
    
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    if (transcript.status !== 'completed') {
      return res.status(400).json({ error: 'Transcript processing is not complete' });
    }
    
    // Check if profile already exists for this transcript
    const existingProfile = await Profile.findOne({ transcriptId });
    
    if (existingProfile) {
      return res.status(409).json({ 
        error: 'Profile already exists for this transcript',
        profileId: existingProfile._id
      });
    }
    
    // Create a new profile record
    const profile = new Profile({
      clientId: transcript.clientId,
      transcriptId,
      status: 'processing'
    });
    
    await profile.save();
    
    // Process the profile asynchronously
    styleService.generateProfile(profile._id, transcript)
      .then(async (result) => {
        // Update the profile with the generated data
        profile.voice = result.voice || [];
        profile.themes = result.themes || [];
        profile.values = result.values || [];
        profile.emotionalTone = result.emotionalTone || [];
        profile.relatability = result.relatability || [];
        profile.rawProfile = result.rawProfile;
        profile.status = 'completed';
        await profile.save();
      })
      .catch(async (error) => {
        console.error('Profile generation failed:', error);
        profile.status = 'failed';
        profile.metadata = { error: error.message };
        await profile.save();
      });
    
    // Return the profile ID immediately
    res.status(202).json({
      message: 'Profile generation started',
      profileId: profile._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile status
router.get('/:id/status', async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id, 'status');
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json({ status: profile.status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a profile
router.delete('/:id', async (req, res) => {
  try {
    const profile = await Profile.findByIdAndDelete(req.params.id);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
