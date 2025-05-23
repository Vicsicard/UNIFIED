/**
 * Vapi Webhook Handler
 * 
 * Receives callbacks from Vapi.ai when calls are completed
 */

const express = require('express');
const router = express.Router();
const Interview = require('../../models/interview');
const Transcript = require('../../models/transcript');
const transcriptService = require('../../services/transcript/transcript-service');

// Webhook endpoint for Vapi call completion
router.post('/call-completed', async (req, res) => {
  try {
    const { 
      call_id, 
      transcript, 
      audio_url, 
      client_id, 
      duration,
      timestamp,
      metadata 
    } = req.body;
    
    if (!call_id || !transcript) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Find the interview by call ID
    const interview = await Interview.findOne({ callId: call_id });
    
    if (!interview) {
      console.error(`Interview not found for call ID: ${call_id}`);
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    // Update interview status
    interview.status = 'completed';
    interview.transcriptUrl = audio_url; // Store the audio URL
    interview.audioUrl = audio_url;
    interview.duration = duration;
    interview.completedTime = new Date(timestamp) || new Date();
    interview.metadata = metadata || {};
    
    await interview.save();
    
    // Create a new transcript record
    const transcriptRecord = new Transcript({
      clientId: interview.clientId,
      interviewId: interview._id,
      sourceType: 'vapi',
      sourceUrl: audio_url,
      rawText: transcript,
      status: 'processing'
    });
    
    await transcriptRecord.save();
    
    // Process the transcript asynchronously
    transcriptService.processVapiTranscript(transcriptRecord._id, transcript)
      .then(async (result) => {
        // Update the transcript with the processed data
        transcriptRecord.chunks = result.chunks;
        transcriptRecord.status = 'completed';
        transcriptRecord.metadata = result.metadata;
        await transcriptRecord.save();
        
        // Automatically trigger style profile generation
        const profileResponse = await fetch(`${req.protocol}://${req.get('host')}/api/profiles/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transcriptId: transcriptRecord._id
          })
        });
        
        if (!profileResponse.ok) {
          console.error('Failed to trigger profile generation:', await profileResponse.text());
        }
      })
      .catch(async (error) => {
        console.error('Transcript processing failed:', error);
        transcriptRecord.status = 'failed';
        transcriptRecord.metadata = { error: error.message };
        await transcriptRecord.save();
      });
    
    // Acknowledge receipt of the webhook
    res.status(200).json({ 
      message: 'Webhook received successfully',
      transcriptId: transcriptRecord._id
    });
  } catch (error) {
    console.error('Error processing Vapi webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint for Vapi call status updates
router.post('/call-status', async (req, res) => {
  try {
    const { call_id, status } = req.body;
    
    if (!call_id || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Find the interview by call ID
    const interview = await Interview.findOne({ callId: call_id });
    
    if (!interview) {
      console.error(`Interview not found for call ID: ${call_id}`);
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    // Map Vapi status to our status
    let interviewStatus;
    switch (status) {
      case 'in-progress':
        interviewStatus = 'in-progress';
        break;
      case 'completed':
        interviewStatus = 'completed';
        break;
      case 'failed':
        interviewStatus = 'failed';
        break;
      default:
        interviewStatus = interview.status; // Keep current status
    }
    
    // Update interview status
    interview.status = interviewStatus;
    await interview.save();
    
    // Acknowledge receipt of the webhook
    res.status(200).json({ 
      message: 'Status update received successfully'
    });
  } catch (error) {
    console.error('Error processing Vapi status webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
