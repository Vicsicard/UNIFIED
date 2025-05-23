/**
 * Vapi.ai Service
 * 
 * Handles integration with Vapi.ai for AI voice interviews
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load interview script template
const scriptTemplatePath = path.join(__dirname, 'interview-script.json');
let scriptTemplate;

try {
  if (fs.existsSync(scriptTemplatePath)) {
    scriptTemplate = JSON.parse(fs.readFileSync(scriptTemplatePath, 'utf8'));
  } else {
    console.warn('Interview script template not found. Using default template.');
    scriptTemplate = {
      "name": "Self Cast Studios Interview",
      "description": "AI-powered brand storytelling interview",
      "model": "gpt-4",
      "max_tokens": 500,
      "temperature": 0.7,
      "system_prompt": "You are an expert brand storytelling interviewer for Self Cast Studios. Your goal is to help clients share their authentic voice, values, and vision through thoughtful questions and follow-ups. Be warm, professional, and empathetic.",
      "initial_message": "Hello! I'm your Self Cast Studios AI interviewer. Today, I'll be asking you questions about your background, expertise, values, and vision to help create authentic content for your brand. Feel free to take your time with each response, and don't worry about being perfect - just be yourself. Let's start with an easy one: Could you tell me about what you're currently focusing on in your business or practice?",
      "questions": [
        "Tell me about what you're currently promoting or focusing on in your business.",
        "Could you share a bit about your background and how you got to where you are today?",
        "What was the journey like that led you to this particular field or specialty?",
        "Were there any pivotal moments or experiences that significantly shaped your path?",
        "What makes your approach unique compared to others in your field?",
        "Who are the people you typically work with, and what challenges do they face?",
        "Can you share a story about someone you've helped and the transformation they experienced?",
        "What core values or beliefs guide your work?",
        "How would you describe your philosophy about your field?",
        "What are you most passionate about in your work?",
        "Where do you see yourself or your business going in the future?",
        "Is there anything we haven't covered that you feel is important to share?"
      ]
    };
  }
} catch (error) {
  console.error('Error loading interview script template:', error);
  throw new Error('Failed to load interview script template');
}

class VapiService {
  constructor() {
    this.apiKey = process.env.VAPI_API_KEY;
    this.baseUrl = 'https://api.vapi.ai/v1';
    this.assistantId = process.env.VAPI_ASSISTANT_ID;
  }

  /**
   * Initialize the Vapi client with API key
   */
  initialize() {
    if (!this.apiKey) {
      throw new Error('Vapi API key not found in environment variables');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return this;
  }

  /**
   * Create a new Vapi assistant if one doesn't exist
   */
  async createAssistant() {
    try {
      if (this.assistantId) {
        // Check if assistant exists
        const response = await this.client.get(`/assistants/${this.assistantId}`);
        return response.data;
      }

      // Create a new assistant
      const response = await this.client.post('/assistants', {
        name: scriptTemplate.name,
        description: scriptTemplate.description,
        model: scriptTemplate.model,
        max_tokens: scriptTemplate.max_tokens,
        temperature: scriptTemplate.temperature,
        system_prompt: scriptTemplate.system_prompt,
        initial_message: scriptTemplate.initial_message,
        voice: {
          provider: "openai",
          voice_id: "alloy" // Default voice, can be configured
        },
        webhook_url: `${process.env.BASE_URL || 'http://localhost:3000'}/webhooks/vapi/call-completed`
      });

      this.assistantId = response.data.id;
      console.log(`Created new Vapi assistant with ID: ${this.assistantId}`);
      
      return response.data;
    } catch (error) {
      console.error('Error creating Vapi assistant:', error.response?.data || error.message);
      throw new Error('Failed to create Vapi assistant');
    }
  }

  /**
   * Schedule a call with a client
   * @param {Object} interview - Interview object with client details
   * @returns {Object} - Call details
   */
  async scheduleCall(interview) {
    try {
      if (!this.client) {
        this.initialize();
      }

      if (!this.assistantId) {
        await this.createAssistant();
      }

      const response = await this.client.post('/calls', {
        assistant_id: this.assistantId,
        to: {
          type: "phone",
          number: interview.clientPhone || "+15555555555" // Default number for testing
        },
        from: {
          type: "phone",
          number: process.env.VAPI_PHONE_NUMBER || "+15555555555" // Your Vapi phone number
        },
        scheduled_time: interview.scheduledTime ? new Date(interview.scheduledTime).toISOString() : null,
        metadata: {
          client_id: interview.clientId,
          client_name: interview.clientName,
          client_email: interview.clientEmail
        }
      });

      return {
        callId: response.data.id,
        status: response.data.status
      };
    } catch (error) {
      console.error('Error scheduling Vapi call:', error.response?.data || error.message);
      throw new Error('Failed to schedule Vapi call');
    }
  }

  /**
   * Initiate an immediate call with a client
   * @param {Object} interview - Interview object with client details
   * @returns {Object} - Call details
   */
  async initiateCall(interview) {
    try {
      if (!this.client) {
        this.initialize();
      }

      if (!this.assistantId) {
        await this.createAssistant();
      }

      const response = await this.client.post('/calls', {
        assistant_id: this.assistantId,
        to: {
          type: "phone",
          number: interview.clientPhone || "+15555555555" // Default number for testing
        },
        from: {
          type: "phone",
          number: process.env.VAPI_PHONE_NUMBER || "+15555555555" // Your Vapi phone number
        },
        metadata: {
          client_id: interview.clientId,
          client_name: interview.clientName,
          client_email: interview.clientEmail
        }
      });

      return {
        callId: response.data.id,
        status: response.data.status
      };
    } catch (error) {
      console.error('Error initiating Vapi call:', error.response?.data || error.message);
      throw new Error('Failed to initiate Vapi call');
    }
  }

  /**
   * Get call details
   * @param {string} callId - Vapi call ID
   * @returns {Object} - Call details
   */
  async getCallDetails(callId) {
    try {
      if (!this.client) {
        this.initialize();
      }

      const response = await this.client.get(`/calls/${callId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting Vapi call details:', error.response?.data || error.message);
      throw new Error('Failed to get Vapi call details');
    }
  }

  /**
   * Get call transcript
   * @param {string} callId - Vapi call ID
   * @returns {string} - Call transcript
   */
  async getCallTranscript(callId) {
    try {
      if (!this.client) {
        this.initialize();
      }

      const response = await this.client.get(`/calls/${callId}/transcript`);
      return response.data.transcript;
    } catch (error) {
      console.error('Error getting Vapi call transcript:', error.response?.data || error.message);
      throw new Error('Failed to get Vapi call transcript');
    }
  }
}

module.exports = new VapiService();
