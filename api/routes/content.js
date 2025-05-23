/**
 * Content Routes
 * 
 * Handles API endpoints for managing generated content
 */

const express = require('express');
const router = express.Router();
const Content = require('../../models/content');
const Profile = require('../../models/profile');
const contentService = require('../../services/content/content-service');

// Get all content
router.get('/', async (req, res) => {
  try {
    const content = await Content.find().sort({ createdAt: -1 });
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get content by ID
router.get('/:id', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate content from a profile
router.post('/generate', async (req, res) => {
  try {
    const { profileId } = req.body;
    
    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }
    
    // Check if profile exists and is completed
    const profile = await Profile.findById(profileId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    if (profile.status !== 'completed') {
      return res.status(400).json({ error: 'Profile generation is not complete' });
    }
    
    // Check if content already exists for this profile
    const existingContent = await Content.findOne({ profileId });
    
    if (existingContent) {
      return res.status(409).json({ 
        error: 'Content already exists for this profile',
        contentId: existingContent._id
      });
    }
    
    // Create a new content record
    const content = new Content({
      clientId: profile.clientId,
      profileId,
      status: 'processing'
    });
    
    await content.save();
    
    // Generate content asynchronously
    contentService.generateContent(content._id, profile)
      .then(async (result) => {
        // Update the content with the generated data
        content.contentFields = result.contentFields || [];
        content.status = 'completed';
        await content.save();
      })
      .catch(async (error) => {
        console.error('Content generation failed:', error);
        content.status = 'failed';
        content.metadata = { error: error.message };
        await content.save();
      });
    
    // Return the content ID immediately
    res.status(202).json({
      message: 'Content generation started',
      contentId: content._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get content status
router.get('/:id/status', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id, 'status');
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.json({ status: content.status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update content fields
router.put('/:id/fields', async (req, res) => {
  try {
    const { contentFields } = req.body;
    
    if (!contentFields || !Array.isArray(contentFields)) {
      return res.status(400).json({ error: 'Content fields array is required' });
    }
    
    const content = await Content.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    content.contentFields = contentFields;
    await content.save();
    
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve content
router.post('/:id/approve', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    content.status = 'approved';
    await content.save();
    
    res.json({ message: 'Content approved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete content
router.delete('/:id', async (req, res) => {
  try {
    const content = await Content.findByIdAndDelete(req.params.id);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
