/**
 * Sarah Continuation Handler
 * 
 * This script manages the continuation of interviews with Sarah.
 * It provides functionality to:
 * 1. Store conversation history by email address
 * 2. Retrieve previous conversations when a client calls back
 * 3. Send context to Sarah about where the previous conversation left off
 */

const axios = require('axios');
require('dotenv').config();

// Vapi API key
const VAPI_API_KEY = process.env.VAPI_API_KEY || '464c8868-c39a-4b79-a368-07cd94763029';

// Create API client
const apiClient = axios.create({
  baseURL: 'https://api.vapi.ai',
  headers: {
    'Authorization': `Bearer ${VAPI_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Database of conversations (in a real implementation, this would be a database)
// For now, we'll use a simple in-memory object
let conversationDatabase = {};

/**
 * Stores a conversation in the database
 * @param {string} email - Client's email address
 * @param {string} fullName - Client's full name
 * @param {object} callData - Call data including transcript and metadata
 * @param {boolean} isComplete - Whether the interview is complete
 */
async function storeConversation(email, fullName, callData, isComplete = false) {
  // Normalize email to lowercase for consistency
  email = email.toLowerCase();
  
  // Create or update the conversation record
  conversationDatabase[email] = {
    fullName,
    callHistory: [...(conversationDatabase[email]?.callHistory || []), callData],
    lastUpdated: new Date().toISOString(),
    isComplete
  };
  
  console.log(`Stored conversation for ${fullName} (${email})`);
  
  // In a real implementation, save to a database here
  return true;
}

/**
 * Retrieves a conversation from the database
 * @param {string} email - Client's email address
 * @returns {object|null} - The conversation data or null if not found
 */
async function getConversation(email) {
  // Normalize email to lowercase for consistency
  email = email.toLowerCase();
  
  // Return the conversation or null if not found
  return conversationDatabase[email] || null;
}

/**
 * Processes a completed call to extract client information and conversation context
 * @param {string} callId - The Vapi call ID
 */
async function processCompletedCall(callId) {
  try {
    // Get call details from Vapi
    const callResponse = await apiClient.get(`/call/${callId}`);
    const call = callResponse.data;
    
    // Get transcript from Vapi
    const transcriptResponse = await apiClient.get(`/call/${callId}/transcript`);
    const transcript = transcriptResponse.data;
    
    // Get structured data from Vapi (contains email and name)
    const analysisResponse = await apiClient.get(`/call/${callId}/analysis`);
    const analysis = analysisResponse.data;
    
    // Extract client information
    const email = analysis.structuredData?.email_address;
    const fullName = analysis.structuredData?.full_name;
    
    if (!email || !fullName) {
      console.log('Missing client information, cannot store conversation');
      return;
    }
    
    // Determine if the interview is complete or was interrupted
    const isComplete = !transcript.some(item => 
      item.role === 'assistant' && 
      (item.content.includes('continue this conversation when you call back') || 
       item.content.includes('pause here and continue next time'))
    );
    
    // Store the conversation
    await storeConversation(email, fullName, {
      callId,
      timestamp: new Date().toISOString(),
      transcript,
      analysis
    }, isComplete);
    
    console.log(`Processed call ${callId} for ${fullName} (${email}). Interview ${isComplete ? 'complete' : 'incomplete'}`);
  } catch (error) {
    console.error('Error processing call:', error.message);
  }
}

/**
 * Prepares context for a continuation call
 * @param {string} email - Client's email address
 * @returns {object|null} - Context object for Sarah or null if no previous conversation
 */
async function prepareContextForContinuation(email) {
  // Get the conversation
  const conversation = await getConversation(email);
  
  if (!conversation || conversation.isComplete) {
    return null;
  }
  
  // Get the most recent call
  const lastCall = conversation.callHistory[conversation.callHistory.length - 1];
  
  // Extract the last few exchanges to provide context
  const transcript = lastCall.transcript;
  const lastExchanges = transcript.slice(-6); // Last 3 turns (6 messages if alternating)
  
  // Identify the last topic discussed
  const lastTopic = lastCall.analysis.structuredData?.focus_area || 'your story';
  
  // Create a context object for Sarah
  return {
    clientName: conversation.fullName,
    clientEmail: email,
    lastTopic,
    lastExchanges,
    continuationPrompt: `The client ${conversation.fullName} (${email}) is returning to continue a previous interview. Their last conversation ended while discussing ${lastTopic}. Here are the last few exchanges from that conversation: ${JSON.stringify(lastExchanges)}. Please acknowledge that you recognize them, mention the topic they were discussing, and ask if they'd like to continue where they left off.`
  };
}

/**
 * Webhook handler for incoming calls
 * This would be called by Vapi when a call starts
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function handleIncomingCall(req, res) {
  try {
    const { call } = req.body;
    
    // In a real implementation, you would:
    // 1. Wait for Sarah to collect the email address
    // 2. Check if there's a previous conversation
    // 3. If yes, send context to Sarah via the server URL feature
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling incoming call:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Webhook handler for completed calls
 * This would be called by Vapi when a call ends
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function handleCompletedCall(req, res) {
  try {
    const { call } = req.body;
    
    // Process the completed call
    await processCompletedCall(call.id);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling completed call:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// Export functions for use in an Express server
module.exports = {
  storeConversation,
  getConversation,
  processCompletedCall,
  prepareContextForContinuation,
  handleIncomingCall,
  handleCompletedCall
};

// For testing purposes
if (require.main === module) {
  // Example usage
  (async () => {
    // Process a call when it completes
    // await processCompletedCall('call-id-here');
    
    // Check if a client has a previous conversation
    // const context = await prepareContextForContinuation('client@example.com');
    // console.log(context);
  })();
}
