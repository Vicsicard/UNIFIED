/**
 * Content Generation Service
 * 
 * Handles generation of content based on transcripts and style profiles
 * Adapted from App 3 (Content Generator Suite)
 */

const { OpenAI } = require('openai');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Content = require('../../models/content');
const Profile = require('../../models/profile');
const Transcript = require('../../models/transcript');

class ContentService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // MongoDB connection for direct access
    this.mongoClient = null;
    this.mongoDb = null;
    
    // Create necessary directories
    this.setupDirectories();
  }

  /**
   * Set up necessary directories for content generation
   */
  setupDirectories() {
    const dirs = [
      path.join(__dirname, 'temp'),
      path.join(__dirname, 'output'),
      path.join(__dirname, 'templates')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Initialize MongoDB connection
   */
  async initMongoDB() {
    if (this.mongoClient) {
      return;
    }
    
    try {
      // Use the existing mongoose connection
      if (mongoose.connection.readyState === 1) {
        this.mongoDb = mongoose.connection.db;
        return;
      }
      
      // Connect to MongoDB directly if needed
      const MongoClient = require('mongodb').MongoClient;
      this.mongoClient = new MongoClient(process.env.MONGODB_URI);
      await this.mongoClient.connect();
      
      // Get database name from URI
      const dbName = process.env.MONGODB_URI.split('/').pop().split('?')[0];
      this.mongoDb = this.mongoClient.db(dbName);
      
      console.log('Connected to MongoDB for content generation');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Generate content from a style profile
   * @param {string} contentId - MongoDB ID of the content
   * @param {Object} profile - Style profile object
   * @returns {Promise<Object>} - Generated content
   */
  async generateContent(contentId, profile) {
    try {
      // Initialize MongoDB connection
      await this.initMongoDB();
      
      const content = await Content.findById(contentId);
      if (!content) {
        throw new Error('Content not found');
      }
      
      // Get the transcript
      const transcript = await Transcript.findById(profile.transcriptId);
      if (!transcript) {
        throw new Error('Transcript not found');
      }
      
      // Generate content fields
      const contentFields = await this.generateAllContentFields(transcript, profile);
      
      // Save to MongoDB projects collection if available
      await this.saveToMongoDBProjects(content.clientId, contentFields);
      
      return {
        contentFields
      };
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  /**
   * Generate all content fields
   * @param {Object} transcript - Transcript object
   * @param {Object} profile - Style profile object
   * @returns {Promise<Object>} - Generated content fields
   */
  async generateAllContentFields(transcript, profile) {
    try {
      // Extract client information
      const clientName = this.extractClientName(profile);
      const expertise = this.extractExpertise(profile);
      const values = profile.values || [];
      
      // Initialize output fields
      const output = {};
      
      // Generate basic site content
      console.log('Generating basic site content');
      output['rendered_title'] = clientName;
      output['rendered_subtitle'] = await this.generateSubtitle(expertise, values);
      output['rendered_bio_html'] = await this.generateBio(transcript, profile, clientName);
      
      // Generate bio cards
      const bioHighlights = await this.extractHighlights(transcript, values);
      for (let i = 0; i < Math.min(bioHighlights.length, 3); i++) {
        output[`bio_card_${i + 1}`] = bioHighlights[i];
      }
      
      // Generate blog content
      console.log('Generating blog content');
      const blogPosts = await this.generateBlogPosts(transcript, profile, clientName);
      output['blog_post_title'] = blogPosts.title;
      output['blog_post_content'] = blogPosts.content;
      
      // Generate social media content
      console.log('Generating social media content');
      const socialContent = await this.generateSocialContent(transcript, profile, clientName);
      
      // LinkedIn
      output['linkedin_post_1'] = socialContent.linkedin[0];
      output['linkedin_post_2'] = socialContent.linkedin[1];
      
      // Twitter/X
      output['twitter_post_1'] = socialContent.twitter[0];
      output['twitter_post_2'] = socialContent.twitter[1];
      
      // Instagram
      output['instagram_post_1'] = socialContent.instagram[0];
      output['instagram_post_2'] = socialContent.instagram[1];
      
      // Facebook
      output['facebook_post_1'] = socialContent.facebook[0];
      output['facebook_post_2'] = socialContent.facebook[1];
      
      return output;
    } catch (error) {
      console.error('Error generating content fields:', error);
      throw error;
    }
  }

  /**
   * Extract client name from profile
   * @param {Object} profile - Style profile
   * @returns {string} - Client name
   */
  extractClientName(profile) {
    // Try to find client name in profile
    const possibleNames = [];
    
    // Look in raw profile for client name
    if (profile.rawProfile) {
      const matches = profile.rawProfile.match(/Client ID: (.+?)\\n/);
      if (matches && matches[1]) {
        possibleNames.push(matches[1]);
      }
    }
    
    // Default to a placeholder if no name found
    return possibleNames[0] || 'Brand Name';
  }

  /**
   * Extract expertise from profile
   * @param {Object} profile - Style profile
   * @returns {string} - Expertise
   */
  extractExpertise(profile) {
    // Look for expertise in themes
    const themes = profile.themes || [];
    if (themes.length > 0) {
      return themes[0];
    }
    
    return 'Professional Services';
  }

  /**
   * Generate subtitle
   * @param {string} expertise - Client expertise
   * @param {Array} values - Client values
   * @returns {Promise<string>} - Generated subtitle
   */
  async generateSubtitle(expertise, values) {
    try {
      const prompt = `Create a short, compelling subtitle for a personal brand website. The person's expertise is in ${expertise}. Their core values include: ${values.join(', ')}. The subtitle should be concise (5-10 words) and capture their unique value proposition.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a skilled copywriter who creates concise, impactful taglines." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 50
      });
      
      return response.choices[0].message.content.trim().replace(/"/g, '');
    } catch (error) {
      console.error('Error generating subtitle:', error);
      return `${expertise} Expert`;
    }
  }

  /**
   * Generate bio
   * @param {Object} transcript - Transcript object
   * @param {Object} profile - Style profile
   * @param {string} clientName - Client name
   * @returns {Promise<string>} - Generated bio HTML
   */
  async generateBio(transcript, profile, clientName) {
    try {
      // Prepare transcript text
      const transcriptText = transcript.chunks.map(chunk => chunk.text).join('\n\n');
      
      // Prepare style profile text
      const styleText = `
Voice: ${profile.voice.join(', ')}
Themes: ${profile.themes.join(', ')}
Values: ${profile.values.join(', ')}
Emotional Tone: ${profile.emotionalTone.join(', ')}
Relatability: ${profile.relatability.join(', ')}
`;
      
      const prompt = `Create a compelling professional bio for ${clientName}. Use the following interview transcript and style profile to capture their authentic voice, expertise, and unique value proposition.

TRANSCRIPT:
${transcriptText.substring(0, 2000)}... [truncated]

STYLE PROFILE:
${styleText}

The bio should:
1. Be written in the third person
2. Be 3-4 paragraphs long
3. Highlight their expertise, approach, and values
4. Include a call to action at the end
5. Use their authentic voice and tone
6. Be formatted in HTML with appropriate paragraph tags

Output only the HTML bio without any explanation.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an expert copywriter who creates compelling professional bios." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating bio:', error);
      return `<p>${clientName} is a professional with expertise in their field.</p>`;
    }
  }

  /**
   * Extract highlights from transcript
   * @param {Object} transcript - Transcript object
   * @param {Array} values - Client values
   * @returns {Promise<Array>} - Extracted highlights
   */
  async extractHighlights(transcript, values) {
    try {
      // Prepare transcript text
      const transcriptText = transcript.chunks.map(chunk => chunk.text).join('\n\n');
      
      const prompt = `Extract 3 key highlights or unique selling points from the following interview transcript. The person's core values include: ${values.join(', ')}.

TRANSCRIPT:
${transcriptText.substring(0, 2000)}... [truncated]

For each highlight:
1. Create a short, attention-grabbing title (3-5 words)
2. Write a brief description (1-2 sentences) that explains the benefit or unique approach
3. Format each as "Title: Description"

Return exactly 3 highlights, separated by newlines.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an expert at identifying and articulating unique value propositions." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      // Parse the response into highlights
      const highlightsText = response.choices[0].message.content.trim();
      const highlights = highlightsText.split('\n\n').map(highlight => highlight.trim());
      
      return highlights.slice(0, 3);
    } catch (error) {
      console.error('Error extracting highlights:', error);
      return [
        "Expertise: Professional services with years of experience.",
        "Client Focus: Dedicated to delivering exceptional results.",
        "Innovation: Bringing fresh perspectives to every project."
      ];
    }
  }

  /**
   * Generate blog posts
   * @param {Object} transcript - Transcript object
   * @param {Object} profile - Style profile
   * @param {string} clientName - Client name
   * @returns {Promise<Object>} - Generated blog post
   */
  async generateBlogPosts(transcript, profile, clientName) {
    try {
      // Prepare transcript text
      const transcriptText = transcript.chunks.map(chunk => chunk.text).join('\n\n');
      
      // Prepare style profile text
      const styleText = `
Voice: ${profile.voice.join(', ')}
Themes: ${profile.themes.join(', ')}
Values: ${profile.values.join(', ')}
`;
      
      const prompt = `Create a blog post based on the following interview transcript and style profile for ${clientName}.

TRANSCRIPT:
${transcriptText.substring(0, 2000)}... [truncated]

STYLE PROFILE:
${styleText}

The blog post should:
1. Have an engaging title that includes a keyword related to their expertise
2. Be 500-700 words long
3. Be structured with an introduction, 3-4 main points, and a conclusion
4. Include a call to action at the end
5. Match their authentic voice and tone
6. Be formatted in HTML with appropriate heading and paragraph tags

Return the blog post as a JSON object with 'title' and 'content' fields.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an expert content writer who creates engaging blog posts." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });
      
      // Parse the response
      const responseText = response.choices[0].message.content.trim();
      
      try {
        // Try to parse as JSON
        const blogPost = JSON.parse(responseText);
        return {
          title: blogPost.title,
          content: blogPost.content
        };
      } catch (parseError) {
        // If not valid JSON, extract title and content manually
        const titleMatch = responseText.match(/title["\s:]+([^"]+)/i);
        const title = titleMatch ? titleMatch[1] : 'Blog Post';
        
        const contentMatch = responseText.match(/content["\s:]+([^}]+)/i);
        const content = contentMatch ? contentMatch[1].replace(/^"|"$/g, '') : responseText;
        
        return {
          title,
          content
        };
      }
    } catch (error) {
      console.error('Error generating blog post:', error);
      return {
        title: `Insights from ${clientName}`,
        content: '<p>Blog content will be generated soon.</p>'
      };
    }
  }

  /**
   * Generate social media content
   * @param {Object} transcript - Transcript object
   * @param {Object} profile - Style profile
   * @param {string} clientName - Client name
   * @returns {Promise<Object>} - Generated social media content
   */
  async generateSocialContent(transcript, profile, clientName) {
    try {
      // Prepare transcript text
      const transcriptText = transcript.chunks.map(chunk => chunk.text).join('\n\n');
      
      // Prepare style profile text
      const styleText = `
Voice: ${profile.voice.join(', ')}
Themes: ${profile.themes.join(', ')}
Values: ${profile.values.join(', ')}
`;
      
      const prompt = `Create social media posts for ${clientName} based on their interview transcript and style profile.

TRANSCRIPT:
${transcriptText.substring(0, 1500)}... [truncated]

STYLE PROFILE:
${styleText}

Generate 2 posts each for:
1. LinkedIn (professional, 1-2 paragraphs)
2. Twitter/X (concise, under 280 characters)
3. Instagram (visual description + hashtags)
4. Facebook (conversational, medium length)

Each post should:
- Capture their authentic voice
- Highlight different aspects of their expertise or values
- Include a call to action
- For Twitter/X, ensure posts are under 280 characters

Return the posts as a JSON object with arrays for each platform.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an expert social media content creator." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });
      
      // Parse the response
      const responseText = response.choices[0].message.content.trim();
      
      try {
        // Try to parse as JSON
        const socialContent = JSON.parse(responseText);
        return {
          linkedin: socialContent.linkedin || [],
          twitter: socialContent.twitter || [],
          instagram: socialContent.instagram || [],
          facebook: socialContent.facebook || []
        };
      } catch (parseError) {
        // If not valid JSON, create default content
        console.error('Error parsing social content:', parseError);
        return {
          linkedin: [
            `Sharing insights on professional development and growth. Connect with ${clientName} to learn more about our approach to success.`,
            `Innovation and excellence are at the core of what we do. Discover how ${clientName} can help you achieve your goals.`
          ],
          twitter: [
            `Excited to share my expertise in the field. Let's connect and grow together! #ProfessionalDevelopment`,
            `New insights on industry trends now available. Check out our latest offerings! #Innovation`
          ],
          instagram: [
            `Sharing a glimpse into our professional journey. #GrowthMindset #Success`,
            `Behind the scenes of our latest project. #Innovation #Excellence`
          ],
          facebook: [
            `We're passionate about helping our clients succeed. Reach out to learn how we can support your goals!`,
            `Exciting developments in our field that we can't wait to share with you. Stay tuned for more updates!`
          ]
        };
      }
    } catch (error) {
      console.error('Error generating social content:', error);
      return {
        linkedin: [
          `Sharing insights on professional development and growth. Connect with ${clientName} to learn more about our approach to success.`,
          `Innovation and excellence are at the core of what we do. Discover how ${clientName} can help you achieve your goals.`
        ],
        twitter: [
          `Excited to share my expertise in the field. Let's connect and grow together! #ProfessionalDevelopment`,
          `New insights on industry trends now available. Check out our latest offerings! #Innovation`
        ],
        instagram: [
          `Sharing a glimpse into our professional journey. #GrowthMindset #Success`,
          `Behind the scenes of our latest project. #Innovation #Excellence`
        ],
        facebook: [
          `We're passionate about helping our clients succeed. Reach out to learn how we can support your goals!`,
          `Exciting developments in our field that we can't wait to share with you. Stay tuned for more updates!`
        ]
      };
    }
  }

  /**
   * Save content to MongoDB projects collection
   * @param {string} clientId - Client ID
   * @param {Object} contentFields - Content fields
   * @returns {Promise<Object>} - Save result
   */
  async saveToMongoDBProjects(clientId, contentFields) {
    try {
      if (!this.mongoDb) {
        console.log('MongoDB not available - skipping MongoDB save');
        return {
          success: false,
          local_only: true,
          message: 'MongoDB not available'
        };
      }
      
      // Format content for MongoDB
      const formattedContent = Object.entries(contentFields).map(([key, value]) => ({
        key,
        value
      }));
      
      // Check if project exists
      const projectsCollection = this.mongoDb.collection('projects');
      const project = await projectsCollection.findOne({ projectId: clientId });
      
      if (!project) {
        console.log(`Project not found: ${clientId}, will create new project`);
        // Create new project
        const projectData = {
          projectId: clientId,
          name: this.extractClientName({ rawProfile: `Client ID: ${clientId}\n` }),
          content: formattedContent,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = await projectsCollection.insertOne(projectData);
        console.log(`Created new project with ID: ${result.insertedId}`);
        
        return {
          success: true,
          project_id: clientId,
          fields_count: Object.keys(contentFields).length,
          message: 'Content saved to new MongoDB project'
        };
      } else {
        // Update existing project
        const result = await projectsCollection.updateOne(
          { projectId: clientId },
          {
            $set: {
              content: formattedContent,
              updatedAt: new Date()
            }
          }
        );
        
        console.log(`Updated existing project, matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
        
        return {
          success: true,
          project_id: clientId,
          fields_count: Object.keys(contentFields).length,
          message: 'Content updated in existing MongoDB project'
        };
      }
    } catch (error) {
      console.error('Failed to save content to MongoDB:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error saving to MongoDB'
      };
    }
  }

  /**
   * Clean up temporary files
   * @param {string} tempDir - Temporary directory to clean
   */
  cleanupTempFiles(tempDir) {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}

module.exports = new ContentService();
