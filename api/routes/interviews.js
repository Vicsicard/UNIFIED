/**
 * Interview Routes
 * 
 * Handles API endpoints for managing interviews
 */

const express = require('express');
const router = express.Router();
const Interview = require('../../models/interview');
const vapiService = require('../../services/vapi/vapi-service');

// Get all interviews
router.get('/', async (req, res) => {
  try {
    const interviews = await Interview.find().sort({ createdAt: -1 });
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get interview by ID
router.get('/:id', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.json(interview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new interview
router.post('/', async (req, res) => {
  try {
    const { clientName, clientEmail, scheduledTime } = req.body;
    
    if (!clientName || !clientEmail) {
      return res.status(400).json({ error: 'Client name and email are required' });
    }
    
    // Generate a unique client ID
    const clientId = `client_${Date.now()}`;
    
    const interview = new Interview({
      clientId,
      clientName,
      clientEmail,
      scheduledTime: scheduledTime || new Date(),
      status: 'scheduled'
    });
    
    await interview.save();
    
    // Schedule the call with Vapi if scheduledTime is provided
    if (scheduledTime) {
      try {
        const callResult = await vapiService.scheduleCall(interview);
        interview.callId = callResult.callId;
        interview.status = 'scheduled';
        await interview.save();
      } catch (vapiError) {
        console.error('Failed to schedule Vapi call:', vapiError);
        // Continue anyway, we can manually trigger the call later
      }
    }
    
    res.status(201).json(interview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an interview
router.put('/:id', async (req, res) => {
  try {
    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    res.json(interview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an interview
router.delete('/:id', async (req, res) => {
  try {
    const interview = await Interview.findByIdAndDelete(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    res.json({ message: 'Interview deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger a Vapi call for an interview
router.post('/:id/call', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    if (interview.status === 'completed') {
      return res.status(400).json({ error: 'Interview already completed' });
    }
    
    const callResult = await vapiService.initiateCall(interview);
    
    interview.callId = callResult.callId;
    interview.status = 'in-progress';
    await interview.save();
    
    res.json({ message: 'Call initiated successfully', callId: callResult.callId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
