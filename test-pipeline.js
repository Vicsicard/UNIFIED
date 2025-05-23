/**
 * Test Pipeline Script
 * 
 * This script tests the core functionality of the unified application
 * by simulating the processing pipeline with a sample transcript.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Import models
const Interview = require('./models/interview');
const Transcript = require('./models/transcript');
const Profile = require('./models/profile');
const Content = require('./models/content');

// Import services
const transcriptService = require('./services/transcript/transcript-service');
const styleService = require('./services/style/style-service');
const contentService = require('./services/content/content-service');

// Sample transcript data
const sampleTranscript = `
# Transcript Chunks for test_client

## chunk_001
I'm currently focusing on helping small business owners develop their personal brand and online presence. My specialty is working with service-based entrepreneurs who have deep expertise but struggle to articulate their unique value.

## chunk_002
My background is in marketing and communications. I spent about 10 years in corporate marketing before starting my own consulting business. That corporate experience gave me insight into branding strategies that normally only large companies can access.

## chunk_003
The turning point for me was when I realized that many talented professionals were being overlooked simply because they couldn't communicate their value effectively. I saw this pattern repeatedly and knew I could help bridge that gap.

## chunk_004
What makes my approach different is that I focus on authenticity rather than creating a polished but generic brand. I believe people connect with real stories and genuine personalities, not perfect facades.

## chunk_005
My clients are typically coaches, consultants, therapists, and other service professionals who are experts in their field but not in marketing themselves. They often feel uncomfortable with self-promotion and worry about coming across as salesy.

## chunk_006
One client I worked with was a therapist specializing in trauma recovery. She was amazing at her work but nearly invisible online. We developed content that sensitively communicated her expertise while respecting the delicate nature of her field. Within three months, she had filled her practice and created a waiting list.

## chunk_007
The core values that guide my work are authenticity, empathy, and effectiveness. I believe marketing should feel good for both the business owner and their audience. There's no need for manipulative tactics when you're truly aligned with your message.

## chunk_008
I see personal branding as a form of self-expression rather than self-promotion. When done right, it should feel liberating and energizing, not draining or fake.

## chunk_009
What energizes me most is seeing the transformation in my clients when they finally embrace their unique voice. There's this moment when they shift from reluctance to excitement about sharing their message, and that's incredibly rewarding.

## chunk_010
Looking ahead, I'm developing a group program to make this work more accessible to early-stage entrepreneurs. I'm also exploring partnerships with business coaches to create a more holistic support system for growing businesses.
`;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Create a test transcript
async function createTestTranscript() {
  try {
    // Create a test client ID
    const clientId = `test_client_${Date.now()}`;
    
    // Create a test interview
    const interview = new Interview({
      clientId,
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      status: 'completed'
    });
    
    await interview.save();
    console.log('Created test interview:', interview._id);
    
    // Create a test transcript
    const transcript = new Transcript({
      clientId,
      interviewId: interview._id,
      sourceType: 'manual',
      status: 'processing',
      rawText: sampleTranscript
    });
    
    await transcript.save();
    console.log('Created test transcript:', transcript._id);
    
    // Parse the sample transcript into chunks
    const chunks = [];
    const lines = sampleTranscript.split('\n');
    let currentChunk = null;
    
    for (const line of lines) {
      if (line.startsWith('## chunk_')) {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        const chunkId = line.substring(3).trim();
        currentChunk = {
          id: chunkId,
          text: '',
          start: 0,
          end: 0
        };
      } else if (currentChunk && line.trim() !== '') {
        currentChunk.text += line + ' ';
      }
    }
    
    // Add the last chunk
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    // Update the transcript with chunks
    transcript.chunks = chunks;
    transcript.status = 'completed';
    await transcript.save();
    
    console.log(`Added ${chunks.length} chunks to transcript`);
    
    return transcript;
  } catch (error) {
    console.error('Error creating test transcript:', error);
    throw error;
  }
}

// Generate a style profile
async function generateStyleProfile(transcript) {
  try {
    // Create a test profile
    const profile = new Profile({
      clientId: transcript.clientId,
      transcriptId: transcript._id,
      status: 'processing'
    });
    
    await profile.save();
    console.log('Created test profile:', profile._id);
    
    // Generate style profile
    console.log('Generating style profile...');
    const result = await styleService.generateProfile(profile._id, transcript);
    
    // Update the profile with the generated data
    profile.voice = result.voice || [];
    profile.themes = result.themes || [];
    profile.values = result.values || [];
    profile.emotionalTone = result.emotionalTone || [];
    profile.relatability = result.relatability || [];
    profile.rawProfile = result.rawProfile;
    profile.status = 'completed';
    await profile.save();
    
    console.log('Style profile generated successfully');
    return profile;
  } catch (error) {
    console.error('Error generating style profile:', error);
    throw error;
  }
}

// Generate content
async function generateContent(profile) {
  try {
    // Create a test content record
    const content = new Content({
      clientId: profile.clientId,
      profileId: profile._id,
      status: 'processing'
    });
    
    await content.save();
    console.log('Created test content:', content._id);
    
    // Generate content
    console.log('Generating content...');
    const result = await contentService.generateContent(content._id, profile);
    
    // Update the content with the generated data
    content.contentFields = Object.entries(result.contentFields).map(([key, value]) => ({
      key,
      value
    }));
    content.status = 'completed';
    await content.save();
    
    console.log('Content generated successfully');
    return content;
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

// Run the test pipeline
async function runTestPipeline() {
  try {
    await connectToMongoDB();
    
    console.log('Starting test pipeline...');
    
    // Step 1: Create a test transcript
    const transcript = await createTestTranscript();
    
    // Step 2: Generate a style profile
    const profile = await generateStyleProfile(transcript);
    
    // Step 3: Generate content
    const content = await generateContent(profile);
    
    console.log('Test pipeline completed successfully!');
    console.log('Generated content fields:', content.contentFields.map(field => field.key));
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error running test pipeline:', error);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    process.exit(1);
  }
}

// Run the test pipeline
runTestPipeline();
