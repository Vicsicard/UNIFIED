/**
 * Simple Test Script
 * 
 * Tests basic functionality of the unified application
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { OpenAI } = require('openai');

// Test OpenAI connection
async function testOpenAI() {
  try {
    console.log('Testing OpenAI connection...');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, can you give me a short greeting?" }
      ],
      max_tokens: 50
    });
    
    console.log('OpenAI response:', response.choices[0].message.content);
    console.log('OpenAI connection successful!');
    return true;
  } catch (error) {
    console.error('OpenAI connection failed:', error.message);
    return false;
  }
}

// Test MongoDB connection
async function testMongoDB() {
  try {
    console.log('Testing MongoDB connection...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connection successful!');
    
    // Disconnect
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('Starting simple tests...');
  
  // Test OpenAI
  const openaiSuccess = await testOpenAI();
  
  // Test MongoDB
  const mongoSuccess = await testMongoDB();
  
  // Summary
  console.log('\nTest Results:');
  console.log('-------------');
  console.log(`OpenAI: ${openaiSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`MongoDB: ${mongoSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (openaiSuccess && mongoSuccess) {
    console.log('\n✅ All tests passed! The application is ready for further development.');
  } else {
    console.log('\n❌ Some tests failed. Please check the error messages above.');
  }
}

// Run the tests
runTests();
